// utils/date.ts
export const timeAgo = (dateString: string | Date): string => {
  const date = new Date(dateString)
  const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  const intervals = {
    année: 31536000,
    mois: 2592000,
    semaine: 604800,
    jour: 86400,
    heure: 3600,
    minute: 60,
    seconde: 1
  }

  let counter: number
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    counter = Math.floor(seconds / secondsInUnit)
    
    if (counter > 0) {
      if (counter === 1) {
        return `il y a ${counter} ${unit}`
      } else {
        // Gestion du pluriel
        const plural = unit.endsWith('s') ? unit : unit + 's'
        return `il y a ${counter} ${plural}`
      }
    }
  }

  return `à l'instant`
}

// Version anglaise alternative :
// export const timeAgo = (dateString: string | Date): string => {
//   const date = new Date(dateString)
//   const formatter = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
//   const ranges = {
//     years: 3600 * 24 * 365,
//     months: 3600 * 24 * 30,
//     weeks: 3600 * 24 * 7,
//     days: 3600 * 24,
//     hours: 3600,
//     minutes: 60,
//     seconds: 1
//   }

//   const secondsElapsed = (date.getTime() - Date.now()) / 1000
//   for (const [rangeKey, rangeVal] of Object.entries(ranges)) {
//     if (rangeVal < Math.abs(secondsElapsed)) {
//       const delta = secondsElapsed / rangeVal
//       return formatter.format(Math.round(delta), rangeKey)
//     }
//   }
//   return 'Maintenant'
// }