import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'

import { firebaseApp } from '@/shared/config/firebase'

export const geminiAI = getAI(firebaseApp, {
  backend: new GoogleAIBackend(),
})

export const geminiModel = getGenerativeModel(geminiAI, {
  model: 'gemini-3.5-flash-lite',
})
