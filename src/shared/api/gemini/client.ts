import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'

import { firebaseApp } from '@/shared/config/firebase'

const ai = getAI(firebaseApp, {
  backend: new GoogleAIBackend(),
})

export const geminiModel = getGenerativeModel(ai, {
  model: 'gemini-3.5-flash-lite',
})
