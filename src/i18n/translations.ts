export const translations = {
  ja: {
    // Header
    appName: 'Meeting Visualizer',
    poweredBy: 'Powered by Nano Banana Pro',

    // Hero
    heroTagline: 'Gemini 3 Pro 搭載',
    heroTitle1: '議事録を',
    heroTitleHighlight: 'アート',
    heroTitle2: 'に変える',
    heroSubtitle: '会議の内容をAIが分析し、手書き風インフォグラフィックを自動生成',

    // Features
    featureAnalysis: 'AI分析',
    featureAnalysisDesc: 'Gemini 3 Proがテキストを解析',
    featureHanddrawn: '手書き風',
    featureHanddrawnDesc: 'Nano Banana Proで温かみのある図解',
    featureFast: '高速生成',
    featureFastDesc: '数分で複数枚の画像を生成',

    // Input Form
    inputLabel: '議事録テキスト',
    inputPlaceholder: '会議の議事録やメモをここに貼り付けてください...\n\n例：\n・プロジェクトの進捗報告\n・課題と解決策の議論\n・次回アクションアイテム',
    analyzeWith: 'Gemini 3 Pro で分析',
    charLimitExceeded: '文字数制限を超えています',

    // Slide Options
    slideCountLabel: '生成枚数',
    slideCountAuto: 'オート（AIが最適化）',
    slideCountManual: '手動で指定',
    slideCountUnit: '枚',
    slideCountAutoHint: '推定: {count}枚（{chars}文字から算出）',
    slideCountHint: 'オートならテキスト量に応じて自動決定',

    // Style Options
    styleLabel: 'デザインスタイル',
    styleDefault: '標準 - バランス重視',
    styleMinimal: 'シンプル - 要点のみ',
    styleDetailed: '詳細 - 情報量重視',
    styleHint: '図解の情報密度を調整します',

    // Buttons
    generateButton: 'インフォグラフィックを生成',
    generatingButton: '生成中...',
    stopButton: '生成を停止',
    stoppingButton: '停止中...',
    downloadButton: 'ダウンロード',
    downloadAllButton: 'ZIPでまとめて保存（{count}枚）',
    downloadingButton: 'ZIP作成中...',
    clearResults: '結果をクリア',
    closeButton: '閉じる',

    // Hint
    hintTitle: 'ヒント',
    hintText: '議事録の構造がはっきりしていると、より良い図解が生成されます。トピックごとに段落を分けると効果的です。',

    // Progress
    progressStarting: '開始中...',
    progressAnalyzing: 'テキストを分析中...',
    progressGeneratingYaml: 'プロンプトを生成中...',
    progressGeneratingImages: '画像を生成中...',
    progressCompleted: '完了',
    progressPreparing: '準備中...',
    progressImageCount: '{current} / {total} 枚',
    progressNanoBanana: 'Nano Banana Pro で手書き風画像を生成中',

    // Steps
    stepAnalyzing: 'テキスト分析',
    stepGeneratingYaml: 'プロンプト生成',
    stepGeneratingImages: '画像生成',
    stepCompleted: '完了',

    // Gallery
    galleryTitle: '生成された図解',
    gallerySubtitle: '{count}枚のインフォグラフィックが完成しました',
    gallerySuccess: '生成完了',
    gallerySuccessHint: '画像をクリックすると拡大表示・個別ダウンロードができます',

    // Errors
    errorTitle: 'エラーが発生しました',
    errorGeneric: 'エラーが発生しました',
    errorStartFailed: '生成の開始に失敗しました',
    errorJobFailed: 'ジョブの取得に失敗しました',
    errorGenerationFailed: '生成に失敗しました',
    errorDownloadFailed: 'ダウンロードに失敗しました',
    errorNoDownloadInfo: 'ダウンロードに必要な情報がありません',
    errorImageFetch: '画像の取得に失敗しました',

    // New section
    newGeneration: '新しい図解を生成',

    // Footer
    footerPoweredBy: 'Powered by Gemini 3 Pro',

    // Settings
    settingsTitle: 'API設定',
    settingsApiKey: 'Gemini APIキー',
    settingsApiKeyPlaceholder: 'AIza...',
    settingsApiKeyHint: 'Google AI StudioからAPIキーを取得してください',
    settingsApiKeyLink: 'APIキーを取得',
    settingsSave: '保存',
    settingsSaved: '保存しました',
    settingsRequired: 'APIキーが必要です',
    settingsInvalid: 'APIキーが無効です',
    settingsClose: '閉じる',
    errorApiKeyMissing: 'まず設定画面でGemini APIキーを入力してください。',
  },

  en: {
    // Header
    appName: 'Meeting Visualizer',
    poweredBy: 'Powered by Nano Banana Pro',

    // Hero
    heroTagline: 'Powered by Gemini 3 Pro',
    heroTitle1: 'Transform Minutes into',
    heroTitleHighlight: 'Art',
    heroTitle2: '',
    heroSubtitle: 'AI analyzes your meeting content and automatically generates hand-drawn style infographics',

    // Features
    featureAnalysis: 'AI Analysis',
    featureAnalysisDesc: 'Gemini 3 Pro analyzes your text',
    featureHanddrawn: 'Hand-drawn Style',
    featureHanddrawnDesc: 'Warm illustrations with Nano Banana Pro',
    featureFast: 'Fast Generation',
    featureFastDesc: 'Multiple images in minutes',

    // Input Form
    inputLabel: 'Meeting Minutes',
    inputPlaceholder: 'Paste your meeting minutes or notes here...\n\nExamples:\n- Project progress report\n- Issue and solution discussion\n- Action items for next meeting',
    analyzeWith: 'Analyze with Gemini 3 Pro',
    charLimitExceeded: 'Character limit exceeded',

    // Slide Options
    slideCountLabel: 'Number of Slides',
    slideCountAuto: 'Auto (AI optimized)',
    slideCountManual: 'Manual',
    slideCountUnit: ' slides',
    slideCountAutoHint: 'Estimated: {count} slides (from {chars} characters)',
    slideCountHint: 'Auto mode adjusts based on text length',

    // Style Options
    styleLabel: 'Design Style',
    styleDefault: 'Standard - Balanced',
    styleMinimal: 'Simple - Key points only',
    styleDetailed: 'Detailed - Information-rich',
    styleHint: 'Adjusts information density of infographics',

    // Buttons
    generateButton: 'Generate Infographics',
    generatingButton: 'Generating...',
    stopButton: 'Stop Generation',
    stoppingButton: 'Stopping...',
    downloadButton: 'Download',
    downloadAllButton: 'Download ZIP ({count} images)',
    downloadingButton: 'Creating ZIP...',
    clearResults: 'Clear Results',
    closeButton: 'Close',

    // Hint
    hintTitle: 'Tip',
    hintText: 'Well-structured minutes produce better infographics. Try separating topics into paragraphs.',

    // Progress
    progressStarting: 'Starting...',
    progressAnalyzing: 'Analyzing text...',
    progressGeneratingYaml: 'Generating prompts...',
    progressGeneratingImages: 'Generating images...',
    progressCompleted: 'Completed',
    progressPreparing: 'Preparing...',
    progressImageCount: '{current} / {total} images',
    progressNanoBanana: 'Generating hand-drawn images with Nano Banana Pro',

    // Steps
    stepAnalyzing: 'Text Analysis',
    stepGeneratingYaml: 'Prompt Generation',
    stepGeneratingImages: 'Image Generation',
    stepCompleted: 'Completed',

    // Gallery
    galleryTitle: 'Generated Infographics',
    gallerySubtitle: '{count} infographics completed',
    gallerySuccess: 'Generation Complete',
    gallerySuccessHint: 'Click an image to enlarge and download individually',

    // Errors
    errorTitle: 'An error occurred',
    errorGeneric: 'An error occurred',
    errorStartFailed: 'Failed to start generation',
    errorJobFailed: 'Failed to fetch job',
    errorGenerationFailed: 'Generation failed',
    errorDownloadFailed: 'Download failed',
    errorNoDownloadInfo: 'Missing download information',
    errorImageFetch: 'Failed to fetch image',

    // New section
    newGeneration: 'Generate New Infographics',

    // Footer
    footerPoweredBy: 'Powered by Gemini 3 Pro',

    // Settings
    settingsTitle: 'API Settings',
    settingsApiKey: 'Gemini API Key',
    settingsApiKeyPlaceholder: 'AIza...',
    settingsApiKeyHint: 'Get your API key from Google AI Studio',
    settingsApiKeyLink: 'Get API Key',
    settingsSave: 'Save',
    settingsSaved: 'Saved',
    settingsRequired: 'API key is required',
    settingsInvalid: 'Invalid API key',
    settingsClose: 'Close',
    errorApiKeyMissing: 'Please set your Gemini API key in Settings first.',
  }
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.ja;
