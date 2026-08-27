export class AnswerLockedError extends Error {
  constructor() {
    super('La respuesta de esta pregunta ya quedó registrada.')
    this.name = 'AnswerLockedError'
  }
}

export class InvalidSessionLengthError extends Error {
  constructor() {
    super('La sesión de fármaco solo admite 5, 10, 15 o 20 preguntas.')
    this.name = 'InvalidSessionLengthError'
  }
}

export class NoUnseenQuestionsError extends Error {
  constructor() {
    super('No quedan preguntas nuevas en este ciclo.')
    this.name = 'NoUnseenQuestionsError'
  }
}

export class SessionNotFoundError extends Error {
  constructor() {
    super('No encontramos esa sesión de estudio.')
    this.name = 'SessionNotFoundError'
  }
}
