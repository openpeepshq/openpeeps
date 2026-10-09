import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../components/navigation/types/index';
import { Register } from './Register';

export const RegisterInvitation = (
  props: NativeStackScreenProps<AuthStackParamList, 'SignupInvitation'>
) => <Register {...props} invite />;
