import { Router, Request, Response } from 'express';
import { supabase } from '../config';
import { protect, ensureAuthenticated } from '../authMiddleware';

const router = Router();

// Helper to enforce dev-only access
async function requireDev(req: Request, res: Response): Promise<string | null> {
  const userId = ensureAuthenticated(req, res);
  if (!userId) return null;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_dev')
    .eq('id', userId)
    .single();
  if (error || !profile || !profile.is_dev) {
    res.status(403).json({ error: 'Access denied.' });
    return null;
  }
  return userId;
}

// GET current master configuration
router.get('/master-config', protect, async (req: Request, res: Response) => {
  if (!(await requireDev(req, res))) return;
  const { data, error } = await supabase
    .from('master_config')
    .select('*')
    .single();
  if (error || !data) {
    console.error('Failed to fetch master_config:', error);
    res.status(500).json({ error: error?.message || 'Unknown error' });
    return;
  }
  res.json(data);
});

// PUT update master configuration
router.put('/master-config', protect, async (req: Request, res: Response) => {
  if (!(await requireDev(req, res))) return;
  // Acceptable fields
  const { config_chat_model, config_whisper_model, config_system_prompt, config_report_json_schema, use_gemini } = req.body;
  const updates: any = {};
  if (config_chat_model !== undefined) updates.config_chat_model = config_chat_model;
  if (config_whisper_model !== undefined) updates.config_whisper_model = config_whisper_model;
  if (config_system_prompt !== undefined) updates.config_system_prompt = config_system_prompt;
  if (config_report_json_schema !== undefined) updates.config_report_json_schema = config_report_json_schema;
  if (use_gemini !== undefined) updates.use_gemini = use_gemini;

  // Fetch the single master_config row ID to use in WHERE clause
  const { data: existing, error: idError } = await supabase
    .from('master_config')
    .select('id')
    .single();
  if (idError || !existing) {
    console.error('Failed to get master_config id:', idError);
    res.status(500).json({ error: 'Failed to determine configuration ID.' });
    return;
  }
  const configId = existing.id;
  // Update the single row based on its ID and return the updated row
  const { data: updatedConfig, error: updateErr } = await supabase
    .from('master_config')
    .update(updates)
    .eq('id', configId)
    .select()
    .single();
  if (updateErr || !updatedConfig) {
    console.error('Failed to update master_config:', updateErr);
    res.status(500).json({ error: updateErr?.message || 'Update failed.' });
    return;
  }
  res.json(updatedConfig);
});

export default router; 