import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';

// ... existing code ...

const AddSessionScreen = () => {
  const { userToken } = useAuth(); 

  const [sport, setSport] = useState('Running');
  const [date, setDate] = useState(new Date());
// ... existing code ...
}