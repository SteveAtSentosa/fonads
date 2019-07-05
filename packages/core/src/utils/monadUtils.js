import { append, prepend } from 'ramda'

export const setNotes = (notes, fm) => {
  fm._notes = notes
  return fm._this
}

export const insertNote = (where, note, fm) => {
  const insertFn = where === 'append' ? append : prepend
  fm._notes = insertFn(note, fm._notes)
  return fm._this
}


