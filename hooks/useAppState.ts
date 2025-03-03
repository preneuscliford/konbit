import { useEffect } from 'react'
import { AppState, AppStateStatus, Platform } from 'react-native'
import { focusManager } from '@tanstack/react-query'

export function useAppState() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active')
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])
} 