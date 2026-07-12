export type Locale = 'pt' | 'en';

/**
 * Dicionário de mensagens da interface. O locale `pt` corresponde à UI
 * original do produto (que mantém rótulos editoriais em inglês por decisão
 * de design — esses rótulos não entram aqui por serem iguais nos dois
 * idiomas). Placeholders usam `{nome}` e são resolvidos por `I18nService.t`.
 */
export const MESSAGES = {
  // Comum a várias telas
  'common.correct': { pt: 'Correto', en: 'Correct' },
  'common.wrong': { pt: 'Errado', en: 'Wrong' },
  'common.accuracy': { pt: 'Precisão', en: 'Accuracy' },
  'common.time': { pt: 'Tempo', en: 'Time' },
  'common.level': { pt: 'Nível {level}', en: 'Level {level}' },
  'common.listenTo': { pt: 'Ouvir {character}', en: 'Listen to {character}' },
  'common.expected': { pt: 'Esperado:', en: 'Expected:' },
  'common.yourAnswer': { pt: 'Sua resposta:', en: 'Your answer:' },
  'common.submitting': { pt: 'Registrando…', en: 'Recording…' },
  'common.submitError': {
    pt: 'Não foi possível registrar a tentativa.',
    en: 'Could not record the attempt.',
  },
  'common.invalidPress': {
    pt: 'Pressionamento longo demais para {key} — ignorado.',
    en: 'Press too long for {key} — ignored.',
  },
  'common.pressHint': {
    pt: 'Pressione {key} — solte para encerrar o caractere.',
    en: 'Press {key} — release to end the character.',
  },
  'common.clickToListen': {
    pt: 'Clique em um caractere para ouvir o código.',
    en: 'Click a character to hear its code.',
  },
  'common.loadingLesson': { pt: 'Carregando lição…', en: 'Loading lesson…' },
  'common.lessonError': {
    pt: 'Não foi possível carregar a lição.',
    en: 'Could not load the lesson.',
  },

  // Home
  'home.tagline': {
    pt: 'Treino auditivo e captura por tecla, no seu ritmo.',
    en: 'Listening practice and key capture, at your own pace.',
  },

  // Login
  'login.signinIntro': {
    pt: 'Entre para continuar seu treinamento.',
    en: 'Sign in to continue your training.',
  },
  'login.registerIntro': {
    pt: 'Crie sua conta LMC para começar a treinar.',
    en: 'Create your LMC account to start training.',
  },
  'login.usernameRequired': { pt: 'Informe o usuário.', en: 'Enter your username.' },
  'login.emailRequired': { pt: 'Informe o e-mail.', en: 'Enter your email.' },
  'login.emailInvalid': { pt: 'E-mail inválido.', en: 'Invalid email.' },
  'login.passwordRequired': { pt: 'Informe a senha.', en: 'Enter your password.' },
  'login.genericError': {
    pt: 'Não foi possível concluir. Tente novamente em instantes.',
    en: 'Something went wrong. Try again in a moment.',
  },
  'login.tooManyAttempts': {
    pt: 'Muitas tentativas. Aguarde um instante e tente novamente.',
    en: 'Too many attempts. Wait a moment and try again.',
  },
  'login.invalidCredentials': {
    pt: 'Credenciais inválidas. Verifique usuário e senha.',
    en: 'Invalid credentials. Check your username and password.',
  },
  'login.registerFailed': {
    pt: 'Não foi possível criar a conta. Verifique os dados.',
    en: 'Could not create the account. Check your details.',
  },

  // Dashboard
  'dashboard.statSpeed': { pt: 'Velocidade média', en: 'Average speed' },
  'dashboard.statTrainingTime': { pt: 'Tempo de treino', en: 'Training time' },
  'dashboard.statCorrect': { pt: 'Acertos', en: 'Correct' },
  'dashboard.statsError': {
    pt: 'Não foi possível carregar as estatísticas.',
    en: 'Could not load your statistics.',
  },
  'dashboard.statsLoading': { pt: 'Carregando estatísticas…', en: 'Loading statistics…' },
  'dashboard.historyError': {
    pt: 'Não foi possível carregar o histórico.',
    en: 'Could not load your history.',
  },
  'dashboard.historyLoading': { pt: 'Carregando histórico…', en: 'Loading history…' },
  'dashboard.empty': {
    pt: 'Nenhum treinamento registrado ainda. Complete um exercício para acompanhar sua evolução aqui.',
    en: 'No training recorded yet. Complete an exercise to track your progress here.',
  },
  'dashboard.hit': { pt: 'Acerto', en: 'Hit' },
  'dashboard.miss': { pt: 'Erro', en: 'Miss' },
  'dashboard.multipleChoice': { pt: 'Múltipla escolha', en: 'Multiple choice' },

  // Settings
  'settings.freqLow': { pt: 'Grave', en: 'Low' },
  'settings.freqMid': { pt: 'Médio', en: 'Mid' },
  'settings.freqHigh': { pt: 'Agudo', en: 'High' },
  'settings.allowedKeysHint': {
    pt: 'Somente as teclas acima são aceitas — a lista vem do servidor.',
    en: 'Only the keys above are accepted — the list comes from the server.',
  },
  'settings.allowedKeysError': {
    pt: 'Não foi possível carregar as teclas permitidas.',
    en: 'Could not load the allowed keys.',
  },
  'settings.confirmPrompt': {
    pt: 'Confirmar alterações nas preferências?',
    en: 'Confirm changes to your preferences?',
  },
  'settings.saved': { pt: 'Preferências salvas.', en: 'Preferences saved.' },
  'settings.saveError': {
    pt: 'Não foi possível salvar. Tente novamente.',
    en: 'Could not save. Try again.',
  },
  'settings.loading': { pt: 'Carregando preferências…', en: 'Loading preferences…' },

  // Lessons
  'lessons.error': {
    pt: 'Não foi possível carregar as lições.',
    en: 'Could not load the lessons.',
  },
  'lessons.empty': { pt: 'Nenhuma lição disponível ainda.', en: 'No lessons available yet.' },
  'lessons.loading': { pt: 'Carregando lições…', en: 'Loading lessons…' },
  'lessonDetail.alphabetError': {
    pt: 'Não foi possível carregar o alfabeto Morse.',
    en: 'Could not load the Morse alphabet.',
  },
  'lessonDetail.alphabetLoading': { pt: 'Carregando alfabeto…', en: 'Loading alphabet…' },
  'lessonDetail.letters': { pt: 'Letras', en: 'Letters' },
  'lessonDetail.numbers': { pt: 'Números', en: 'Numbers' },
  'lessonDetail.punctuation': { pt: 'Pontuação', en: 'Punctuation' },
  'lessonDetail.start': { pt: 'Iniciar', en: 'Start' },

  // Treino guiado
  'training.eyebrow': { pt: 'Treino guiado', en: 'Guided training' },
  'training.noContent': {
    pt: 'Esta lição ainda não tem conteúdo de treino.',
    en: 'This lesson has no training content yet.',
  },
  'training.backToLesson': { pt: 'Voltar à lição', en: 'Back to lesson' },
  'training.intro': {
    pt: 'Conheça os caracteres desta lição — clique em cada um para ouvir o código. Em seguida, o treino percorre os quatro modos de prática usando apenas este conteúdo.',
    en: 'Get to know the characters in this lesson — click each one to hear its code. The training then walks through the four practice modes using only this content.',
  },
  'training.contentLabel': { pt: 'Conteúdo', en: 'Content' },
  'training.start': { pt: 'Começar', en: 'Start' },
  'training.stage': { pt: 'Etapa', en: 'Step' },
  'training.exit': { pt: 'Sair', en: 'Exit' },
  'training.done': { pt: 'Treino concluído', en: 'Training complete' },
  'training.summary': {
    pt: '{correct} de {total} corretas em {title}',
    en: '{correct} of {total} correct in {title}',
  },
  'training.repeat': { pt: 'Repetir', en: 'Repeat' },

  // Prática
  'practice.charactersError': {
    pt: 'Não foi possível carregar os caracteres Morse.',
    en: 'Could not load the Morse characters.',
  },
  'practice.loading': { pt: 'Carregando…', en: 'Loading…' },
  'practice.modeKeyCapture': { pt: 'Key capture', en: 'Key capture' },
  'practice.modeTextToMorse': { pt: 'Texto → Morse', en: 'Text → Morse' },
  'practice.modeMorseToText': { pt: 'Morse → Texto', en: 'Morse → Text' },
  'practice.modeListening': { pt: 'Listening', en: 'Listening' },
  'practice.modeKeyCaptureDesc': {
    pt: 'Veja o caractere e transmita o código com a tecla configurada.',
    en: 'See the character and transmit its code with your configured key.',
  },
  'practice.modeTextToMorseDesc': {
    pt: 'Escolha o código correspondente ao caractere.',
    en: 'Choose the code that matches the character.',
  },
  'practice.modeMorseToTextDesc': {
    pt: 'Escolha o caractere correspondente ao código.',
    en: 'Choose the character that matches the code.',
  },
  'practice.modeListeningDesc': {
    pt: 'Ouça o código e identifique o caractere.',
    en: 'Listen to the code and identify the character.',
  },
  'practice.currentCode': { pt: 'Código atual', en: 'Current code' },
  'practice.whichCode': { pt: 'Qual é o código?', en: 'What is the code?' },
  'practice.whichCharacter': { pt: 'Qual é o caractere?', en: 'What is the character?' },
  'practice.listenIdentify': {
    pt: 'Ouça e identifique o caractere',
    en: 'Listen and identify the character',
  },
  'practice.transmit': { pt: 'Transmita o caractere', en: 'Transmit the character' },
  'practice.sessionDone': { pt: 'Sessão concluída', en: 'Session complete' },
  'practice.test': { pt: 'Teste', en: 'Test' },
  'practice.session': { pt: 'Sessão', en: 'Session' },
  'practice.speed': { pt: 'Velocidade', en: 'Speed' },
  'practice.responseTime': { pt: 'Tempo de resposta:', en: 'Response time:' },
} satisfies Record<string, Record<Locale, string>>;

export type MessageKey = keyof typeof MESSAGES;
