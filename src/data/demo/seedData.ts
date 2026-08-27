import type { ChoiceLetter, Drug, QuestionPrompt, QuestionSolution, ReferenceEntry, StudyModule, Topic } from '../../domain/types'

type SeedQuestion = QuestionPrompt & { solution: QuestionSolution }

export const demoModules: StudyModule[] = [
  { id: 'mod-m01', code: 'M01', name: 'Fundamentos de farmacologia', description: 'Farmacos sinteticos y naturales.', sortOrder: 1 },
  { id: 'mod-m02', code: 'M02', name: 'Farmacologia general', description: 'Farmacocinetica, farmacodinamia y posologia.', sortOrder: 2 },
  { id: 'mod-m03', code: 'M03', name: 'Sistema nervioso', description: 'Sistema autonomo, periferico y central.', sortOrder: 3 },
  { id: 'mod-m04', code: 'M04', name: 'Sistema cardiovascular y renal', description: 'Diureticos, antihipertensivos, insuficiencia cardiaca y antiarritmicos.', sortOrder: 4 },
  { id: 'mod-m05', code: 'M05', name: 'Sangre y sistema hematopoyetico', description: 'Hemostasia, anticoagulantes y farmacos hematopoyeticos.', sortOrder: 5 },
  { id: 'mod-m06', code: 'M06', name: 'Sistema endocrino y metabolico', description: 'Hormonas, antidiabeticos, tiroides, gota y hueso.', sortOrder: 6 },
  { id: 'mod-m07', code: 'M07', name: 'Sistema inmunitario e inflamacion', description: 'Mediadores, eicosanoides, AINE y corticoides.', sortOrder: 7 },
  { id: 'mod-m08', code: 'M08', name: 'Sistema respiratorio', description: 'Antiasmaticos, broncodilatadores, antitusigenos y mucoliticos.', sortOrder: 8 },
  { id: 'mod-m09', code: 'M09', name: 'Sistema digestivo', description: 'Secrecion, motilidad, emesis y antiemesis.', sortOrder: 9 },
  { id: 'mod-m10', code: 'M10', name: 'Enfermedades infecciosas', description: 'Antibacterianos, antifungicos, antiparasitarios y antivirales.', sortOrder: 10 },
  { id: 'mod-m11', code: 'M11', name: 'Enfermedades neoplasicas', description: 'Proliferacion tumoral y quimioterapia antineoplasica.', sortOrder: 11 },
]

export const demoTopics: Topic[] = [
  { id: 'topic-m01-general', moduleId: 'mod-m01', name: 'Farmacos sinteticos y naturales', sortOrder: 1 },
  { id: 'topic-m03-autonomo', moduleId: 'mod-m03', name: 'Agonistas y antagonistas colinergicos', sortOrder: 1 },
]

export const demoDrugs: Drug[] = [
  {
    id: 'drug-atropina',
    genericName: 'Atropina',
    moduleIds: ['mod-m03'],
    topicIds: ['topic-m03-autonomo'],
  },
]

export const demoReferences: ReferenceEntry[] = [
  {
    id: 'ref-m01-general',
    title: 'Ficha demostrativa: fundamentos de farmacologia',
    moduleId: 'mod-m01',
    drugIds: [],
    summary: 'Material ilustrativo para probar sesiones, ciclos y progreso antes de importar contenido validado.',
    tags: ['demostracion', 'fundamentos', 'farmacologia'],
  },
  {
    id: 'ref-atropina',
    title: 'Ficha demostrativa: atropina',
    moduleId: 'mod-m03',
    drugIds: ['drug-atropina'],
    summary: 'Material ilustrativo sobre antagonismo muscarinico; debe reemplazarse por bibliografia validada antes de publicar.',
    tags: ['demostracion', 'atropina', 'colinergico'],
  },
]

const letters: ChoiceLetter[] = ['A', 'B', 'C', 'D']

function makeChoices(index: number): QuestionPrompt['choices'] {
  return letters.map((letter) => ({
    letter,
    text: `Alternativa ${letter} para fundamento ${index}`,
  })) as QuestionPrompt['choices']
}

function makeFoundationQuestion(index: number): SeedQuestion {
  const correctLetter = letters[index % letters.length]!
  const id = `q-m01-${String(index).padStart(2, '0')}`

  return {
    id,
    questionCode: `M01-DEMO-${String(index).padStart(2, '0')}`,
    version: 1,
    stem: `Pregunta demostrativa ${index} sobre fundamentos de farmacologia.`,
    choices: makeChoices(index),
    moduleId: 'mod-m01',
    topicId: 'topic-m01-general',
    drugIds: [],
    status: 'published',
    solution: {
      questionId: id,
      correctLetter,
      explanation: 'Retroalimentacion demostrativa: la alternativa correcta representa el principio evaluado en esta pregunta de prueba.',
    },
  }
}

function makeAtropineQuestion(index: number, correctLetter: ChoiceLetter): SeedQuestion {
  const id = `q-atropina-${String(index).padStart(2, '0')}`

  return {
    id,
    questionCode: `M03-ATR-DEMO-${String(index).padStart(2, '0')}`,
    version: 1,
    stem: `Pregunta demostrativa ${index} sobre atropina y farmacologia colinergica.`,
    choices: [
      { letter: 'A', text: 'Bloqueo muscarinico periferico.' },
      { letter: 'B', text: 'Activacion directa de receptores nicotinicos.' },
      { letter: 'C', text: 'Inhibicion selectiva de la ciclooxigenasa.' },
      { letter: 'D', text: 'Aumento de la excrecion renal de sodio.' },
    ],
    moduleId: 'mod-m03',
    topicId: 'topic-m03-autonomo',
    drugIds: ['drug-atropina'],
    status: 'published',
    solution: {
      questionId: id,
      correctLetter,
      explanation: 'Retroalimentacion demostrativa: atropina se usa aqui solo como dato semilla para probar preguntas por farmaco.',
    },
  }
}

export const demoQuestions: SeedQuestion[] = [
  ...Array.from({ length: 20 }, (_, index) => makeFoundationQuestion(index + 1)),
  makeAtropineQuestion(1, 'A'),
  makeAtropineQuestion(2, 'A'),
  makeAtropineQuestion(3, 'A'),
  makeAtropineQuestion(4, 'A'),
]
