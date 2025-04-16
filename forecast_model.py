import argparse
import math
import locale

# --- Configuration & Constants ---

# Costs (Monthly Estimates or Per Unit)
# RAILWAY_SERVER_COST = 60.00  # Monthly - Replaced by combined fixed cost
# SUPABASE_COST = 25.00      # Monthly (Placeholder) - Replaced by combined fixed cost
FIXED_COSTS_MONTHLY = 10.00 # User-provided fixed cost

S3_STORAGE_COST_GB_MONTH = 0.023 # Per GB per Month
S3_PUT_COST_PER_1000 = 0.005    # Cost per 1000 PUT requests
S3_GET_COST_PER_1000 = 0.0004   # Cost per 1000 GET requests
S3_TRANSFER_COST_PER_GB = 0.09 # Data Transfer Out cost per GB

# Report Generation Costs (Per Report)
WHISPER_COST_PER_REPORT = 0.021 # Based on 3.5 min video (adjust per tier below)
GPT_NANO_COST_PER_REPORT = 0.00065 # Based on 4500 input / 500 output tokens
GPT_MINI_COST_PER_REPORT = 0.00260  # Based on 4500 input / 500 output tokens
GPT_4_1_COST_PER_REPORT = 0.01300   # Based on 4500 input / 500 output tokens

# S3 Operations per Report/View (Approximations)
S3_PUTS_PER_REPORT_GENERATION_NO_VIDEO = 4  # Whisper JSON, Report JSON, HTML, 1 Frame (reduced)
S3_PUTS_PER_REPORT_GENERATION_WITH_VIDEO = 14 # Includes Video + ~10 Frames
S3_GETS_PER_REPORT_VIEW_NO_VIDEO = 2   # HTML, Report JSON (reduced)
S3_GETS_PER_REPORT_VIEW_WITH_VIDEO = 12  # Includes Video + Frames

# Estimated Data Size per Report (Approximations in MB)
VIDEO_SIZE_MB_PER_MINUTE = 15 # Rough estimate
WHISPER_JSON_SIZE_MB = 0.1
REPORT_JSON_SIZE_MB = 0.1
HTML_VIEWER_SIZE_MB = 0.05
FRAME_SIZE_MB = 0.5
FRAMES_PER_REPORT = 10

# Tier Definitions (from marketpricing.md)
TIERS = {
    'free': {
        'name': 'Free (Starter)',
        'price_monthly': 0.00,
        'reports_per_month': 5,
        'max_video_min': 1,
        'gpt_model': 'mini',     # Free still uses mini
        'storage_months': 0.25, # ~7 days
        'store_video': False,
        'support_cost_factor': 0.01
    },
    'lite': {
        'name': 'Lite (Daily)',
        'price_monthly': 5.00,
        'reports_per_month': 30,
        'max_video_min': 2,
        'gpt_model': '4.1',      # Using 4.1
        'storage_months': -1,    # Indefinite data storage
        'store_video': False,    # NOT storing video
        'support_cost_factor': 0.05
    },
    'pro': {
        'name': 'Pro (Professional)',
        'price_monthly': 25.00,
        'reports_per_month': 150,    # 5x Lite tier
        'max_video_min': 5,
        'gpt_model': '4.1',      # Using 4.1
        'storage_months': -1,    # Indefinite data storage
        'store_video': False,    # NOT storing video
        'support_cost_factor': 0.10
    },
    'enterprise': {
        'name': 'Enterprise',
        'price_monthly': 100.00,
        'reports_per_month': 500,
        'max_video_min': 15,
        'gpt_model': '4.1',
        'storage_months': -1,   # Indefinite data storage
        'store_video': False,    # Assuming enterprise also defaults to no video? (Can adjust)
        'support_cost_factor': 0.20
    }
}

# --- Helper Functions ---

def get_video_cost(minutes):
    """Estimates Whisper cost based on minutes, assuming linear scaling."""
    # Simple linear scaling based on 3.5 min reference point
    if minutes <= 0: return 0
    cost = (WHISPER_COST_PER_REPORT / 3.5) * minutes
    return cost

def get_gpt_cost(model_name):
    """Returns the cost per report for the specified GPT model."""
    if model_name == 'nano':
        return GPT_NANO_COST_PER_REPORT
    elif model_name == 'mini':
        return GPT_MINI_COST_PER_REPORT
    elif model_name == '4.1':
        return GPT_4_1_COST_PER_REPORT
    else:
        return GPT_NANO_COST_PER_REPORT # Default to cheapest

def calculate_report_size_mb(tier_config):
    """Calculates estimated size of ONE report based on tier config."""
    base_size = WHISPER_JSON_SIZE_MB + REPORT_JSON_SIZE_MB + HTML_VIEWER_SIZE_MB
    if tier_config['store_video']:
        video_size = VIDEO_SIZE_MB_PER_MINUTE * tier_config['max_video_min']
        frame_size = FRAME_SIZE_MB * FRAMES_PER_REPORT
        return base_size + video_size + frame_size
    else:
        # Store only one representative frame if not storing video
        return base_size + FRAME_SIZE_MB

def calculate_s3_costs(users, tier_config):
    """Calculates estimated monthly S3 costs for users in a specific tier."""
    reports_total = users * tier_config['reports_per_month']
    views_total = reports_total # Assumption: 1 view per report

    # --- Generation Costs (PUTs) ---
    puts_per_report = S3_PUTS_PER_REPORT_GENERATION_WITH_VIDEO if tier_config['store_video'] else S3_PUTS_PER_REPORT_GENERATION_NO_VIDEO
    total_puts = reports_total * puts_per_report
    s3_put_cost = (total_puts / 1000) * S3_PUT_COST_PER_1000

    # --- Viewing Costs (GETs + Transfer) ---
    gets_per_view = S3_GETS_PER_REPORT_VIEW_WITH_VIDEO if tier_config['store_video'] else S3_GETS_PER_REPORT_VIEW_NO_VIDEO
    total_gets = views_total * gets_per_view
    s3_get_cost = (total_gets / 1000) * S3_GET_COST_PER_1000

    report_size_mb = calculate_report_size_mb(tier_config)
    # Estimate view transfer size based on whether video is stored
    # If video not stored, assume only metadata/html/frame is viewed
    metadata_frame_size_gb = (WHISPER_JSON_SIZE_MB + REPORT_JSON_SIZE_MB + HTML_VIEWER_SIZE_MB + FRAME_SIZE_MB) / 1024
    full_report_size_gb = report_size_mb / 1024
    view_transfer_gb_per_view = full_report_size_gb if tier_config['store_video'] else metadata_frame_size_gb

    total_transfer_gb = views_total * view_transfer_gb_per_view
    s3_transfer_cost = total_transfer_gb * S3_TRANSFER_COST_PER_GB

    # --- Storage Costs ---
    # Revised logic: Assume average active paid user stores 12 months of history data
    # Free tier still uses its short defined storage_months.
    metadata_frame_size_gb = (WHISPER_JSON_SIZE_MB + REPORT_JSON_SIZE_MB + HTML_VIEWER_SIZE_MB + FRAME_SIZE_MB) / 1024
    gb_per_report = full_report_size_gb if tier_config['store_video'] else metadata_frame_size_gb

    if tier_config['price_monthly'] == 0: # Free tier
        realistic_avg_storage_months = tier_config['storage_months']
        avg_gb_per_user_monthly = tier_config['reports_per_month'] * gb_per_report * realistic_avg_storage_months
    else: # Paid tiers
        AVG_STORAGE_MONTHS_ASSUMPTION = 12 # Assumed average history stored per active paid user
        avg_gb_per_user_monthly = tier_config['reports_per_month'] * gb_per_report * AVG_STORAGE_MONTHS_ASSUMPTION

    total_avg_gb_stored = users * avg_gb_per_user_monthly
    s3_storage_cost = total_avg_gb_stored * S3_STORAGE_COST_GB_MONTH

    total_s3_cost = s3_put_cost + s3_get_cost + s3_transfer_cost + s3_storage_cost
    return total_s3_cost, s3_storage_cost, s3_put_cost + s3_get_cost + s3_transfer_cost


def format_currency(value):
    """Formats a float as currency."""
    try:
        locale.setlocale(locale.LC_ALL, '') # Use system default locale
    except locale.Error:
        locale.setlocale(locale.LC_ALL, 'en_US.UTF-8') # Fallback
    return locale.currency(value, grouping=True)

def print_forecast(user_counts):
    """Calculates and prints the financial forecast."""
    total_revenue = 0
    total_whisper_cost = 0
    total_gpt_cost = 0
    total_s3_storage_cost = 0
    total_s3_other_cost = 0
    total_users = sum(user_counts.values())
    total_reports = 0

    print("-" * 60)
    print(f"{'Financial Forecast':^60}")
    print("-" * 60)
    print(f"{'Tier':<25} {'Users':>10} {'Revenue':>12} {'Est. Cost':>12}")
    print("." * 60)

    for tier_id, users in user_counts.items():
        if users == 0:
            continue

        tier_config = TIERS[tier_id]
        tier_revenue = users * tier_config['price_monthly']
        total_revenue += tier_revenue

        # Per-User Variable Costs
        reports_per_user = tier_config['reports_per_month']
        total_reports += users * reports_per_user

        whisper_cost_per_user = get_video_cost(tier_config['max_video_min']) * reports_per_user
        gpt_cost_per_user = get_gpt_cost(tier_config['gpt_model']) * reports_per_user
        s3_total_cost_user, s3_storage_cost_user, s3_other_cost_user = calculate_s3_costs(1, tier_config) # Calculate per user

        # Aggregate Costs
        tier_whisper_cost = users * whisper_cost_per_user
        tier_gpt_cost = users * gpt_cost_per_user
        tier_s3_total_cost, tier_s3_storage_cost, tier_s3_other_cost = calculate_s3_costs(users, tier_config)

        # Include overhead factor based on revenue/complexity
        tier_overhead = tier_revenue * tier_config['support_cost_factor']

        tier_total_cost = tier_whisper_cost + tier_gpt_cost + tier_s3_total_cost + tier_overhead

        total_whisper_cost += tier_whisper_cost
        total_gpt_cost += tier_gpt_cost
        total_s3_storage_cost += tier_s3_storage_cost
        total_s3_other_cost += tier_s3_other_cost

        print(f"{tier_config['name']:<25} {users:>10,} {format_currency(tier_revenue):>12} {format_currency(tier_total_cost):>12}")

    print("." * 60)

    # Fixed Costs - Use the new constant
    # fixed_costs = RAILWAY_SERVER_COST + SUPABASE_COST
    fixed_costs = FIXED_COSTS_MONTHLY

    # Totals
    total_variable_costs = total_whisper_cost + total_gpt_cost + total_s3_storage_cost + total_s3_other_cost
    # Estimate overhead for free users based on a minimal cost factor per user
    free_user_overhead = user_counts.get('free', 0) * TIERS['free']['price_monthly'] * TIERS['free']['support_cost_factor'] # Price is 0, maybe a fixed small $ amount?
    # Let's assign a minimal fixed overhead per free user instead, e.g., $0.05/month
    free_user_overhead_cost = user_counts.get('free', 0) * 0.05


    total_costs = total_variable_costs + fixed_costs + free_user_overhead_cost # Add overhead from paid tiers already included in tier_total_cost calc

    total_profit = total_revenue - total_costs

    print(f"\n--- Monthly Summary ---")
    print(f"Total Users: {total_users:,} ({user_counts.get('free', 0):,} Free)")
    print(f"Total Reports Generated: {int(total_reports):,}")
    print("-" * 25)
    print(f"{'Total Revenue:':<25} {format_currency(total_revenue):>15}")
    print(f"\n{'Costs Breakdown:':<25}")
    print(f"  {'Fixed Costs:':<23} {format_currency(fixed_costs):>15}")
    print(f"  {'Whisper:':<23} {format_currency(total_whisper_cost):>15}")
    print(f"  {'GPT Models:':<23} {format_currency(total_gpt_cost):>15}")
    print(f"  {'S3 Storage:':<23} {format_currency(total_s3_storage_cost):>15}")
    print(f"  {'S3 Other (PUT/GET/Tx):':<23} {format_currency(total_s3_other_cost):>15}")
    print(f"  {'Est. Overhead/Support:':<23} {format_currency(total_costs - total_variable_costs - fixed_costs):>15}") # Show total derived overhead
    print(f"{'Total Costs:':<25} {format_currency(total_costs):>15}")
    print("-" * 25)
    print(f"{'Estimated Profit:':<25} {format_currency(total_profit):>15}")
    # Correctly format the profit margin conditionally
    profit_margin_str = f"{total_profit / total_revenue:.1%}" if total_revenue > 0 else "N/A"
    print(f"{'Profit Margin:':<25} {profit_margin_str:>15}")
    print("-" * 60)


# --- Main Execution ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Forecast Revenue, Costs, and Profit for Job Site Reporter App.")
    parser.add_argument('--free', type=int, default=1000, help='Number of users in the Free tier.')
    parser.add_argument('--lite', type=int, default=100, help='Number of users in the Lite tier.')
    parser.add_argument('--pro', type=int, default=50, help='Number of users in the Pro tier.')
    parser.add_argument('--enterprise', type=int, default=5, help='Number of users in the Enterprise tier.')

    args = parser.parse_args()

    current_users = {
        'free': args.free,
        'lite': args.lite,
        'pro': args.pro,
        'enterprise': args.enterprise
    }

    # Print the forecast once based on arguments and exit
    print_forecast(current_users)

    # Removed the while loop and input prompts

    # print("Exiting forecast model.") # Optional: Can keep or remove this final message 