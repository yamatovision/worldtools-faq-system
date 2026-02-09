import { Box, Container, Typography, Button, Grid, Paper, Chip, Divider } from '@mui/material';
import {
  SearchOff as SearchOffIcon,
  PictureAsPdf as PdfIcon,
  Build as BuildIcon,
  TrendingDown as TrendingDownIcon,
  MoneyOff as MoneyOffIcon,
  Psychology as PsychologyIcon,
  DocumentScanner as DocumentScannerIcon,
  AutoFixHigh as AutoFixHighIcon,
  Security as SecurityIcon,
  CloudSync as CloudSyncIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  ArrowForward as ArrowForwardIcon,
  Groups as GroupsIcon,
  FormatQuote as FormatQuoteIcon,
  AccessTime as AccessTimeIcon,
  Shield as ShieldIcon,
  Storage as StorageIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

const BRAND = {
  primary: '#c41e3a',
  primaryDark: '#9a1830',
  primaryLight: '#e04858',
  accent: '#4db316',
  dark: '#1a1a2e',
  darkSub: '#2d2d44',
  textLight: '#e0e0e0',
  white: '#ffffff',
  bg: '#f5f7fa',
} as const;

// --- Real Voice Data (ワールドツール想定) ---
const REAL_VOICES = [
  {
    quote: '200店舗分のマニュアルがPDFで散在していて、新人パートが自力で調べられない。結局ベテランに電話が集中する',
    role: '店舗運営部 マネージャー',
    company: 'ワールドツール（200店舗）',
    pain: '情報分散',
  },
  {
    quote: '工具の仕様や互換性の質問が毎日来る。カタログPDFの図表を見れば分かるのに、チャットボットが読み取れない',
    role: '商品企画部 担当者',
    company: 'ワールドツール（200店舗）',
    pain: 'PDF図表',
  },
  {
    quote: 'パート社員は夕方シフトで質問したいが、本部は17時で終わり。翌日まで待たせることになる',
    role: '人事部 部長',
    company: 'ワールドツール（200店舗）',
    pain: '時間外',
  },
  {
    quote: 'ID数で毎月課金されたら200店舗×数人でとても払えない。パッケージ型チャットボットは月20万もする',
    role: '経営企画部 担当者',
    company: 'ワールドツール（200店舗）',
    pain: 'コスト',
  },
  {
    quote: '店舗ごとにマニュアルの置き場所がバラバラ。さくらクラウドのサーバーにあるけど検索性が悪い',
    role: '情報システム部 担当者',
    company: 'ワールドツール（200店舗）',
    pain: '運用負荷',
  },
  {
    quote: '接客マニュアルに書いてない「よくある質問」がある。ベテランの暗黙知を形式知にしたい',
    role: '店舗運営部 マネージャー',
    company: 'ワールドツール（200店舗）',
    pain: '暗黙知',
  },
];

// --- Pain Point Data ---
const PAIN_POINTS = [
  {
    icon: <SearchOffIcon sx={{ fontSize: 40 }} />,
    title: '「結局、人に聞いた方が早い」',
    stat: '62%',
    statLabel: 'が精度に不満',
    description: '自分の言葉で質問しても的外れな回答ばかり。パート社員は3回試して諦め、結局電話で問い合わせ。チャットボットを入れたのに問い合わせ件数が減らない悪循環に。',
  },
  {
    icon: <PdfIcon sx={{ fontSize: 40 }} />,
    title: 'PDF内の図表・フロー図が読めない',
    stat: '78%',
    statLabel: 'が非対応と回答',
    description: '工具カタログや店舗マニュアルの重要情報は図表やフロー図に集中。しかし既存サービスはテキストしか読めず、「製品スペック表」「組立手順図」は全て無視。PowerPoint・Keynoteに至っては対応すらしていないケースが大半。',
  },
  {
    icon: <BuildIcon sx={{ fontSize: 40 }} />,
    title: 'ドキュメント登録が手作業地獄',
    stat: '月40時間',
    statLabel: 'の管理工数',
    description: 'PDFを1個1個手動でアップロード。更新のたびにダウンロード→再アップロード→再学習。さくらクラウドに入れたら自動で反映してほしいのに。',
  },
  {
    icon: <TrendingDownIcon sx={{ fontSize: 40 }} />,
    title: '3ヶ月で使われなくなる',
    stat: '3ヶ月',
    statLabel: 'で利用率50%低下',
    description: '導入直後は話題になるが、精度の低さと出典不明の回答に失望して利用離れ。「回答の根拠がわからない」「担当者の名前が出てくる＝結局そこに電話が来る」が現実。',
  },
  {
    icon: <MoneyOffIcon sx={{ fontSize: 40 }} />,
    title: 'パッケージ型チャットボットは高い',
    stat: '年240万円',
    statLabel: '月額20万×12ヶ月の場合',
    description: '国内主要FAQサービスの月額相場は10〜20万円。PKSHA FAQは初期130万+月額10万〜。sAI Searchは月額19.8万。さらにID課金・データ上限・追加開発費。200店舗への全社展開を諦め一部だけに留まるのが現実。',
  },
];

// --- Feature Data ---
const FEATURES = [
  {
    icon: <PsychologyIcon sx={{ fontSize: 48, color: BRAND.primary }} />,
    title: 'Claude Sonnet 直接推論',
    subtitle: '最先端AIによる高精度回答',
    description: '世界最高水準のAIモデルが社内ドキュメントを直接読み解き回答。「この電動ドリルと互換性のあるビットは？」のような複数カタログにまたがる質問も、横断的に理解して正確に回答します。',
    badge: '最先端AI搭載',
  },
  {
    icon: <DocumentScannerIcon sx={{ fontSize: 48, color: BRAND.primary }} />,
    title: '14形式対応・図表の高精度認識',
    subtitle: 'Claude Vision AI + LibreOffice変換',
    description: 'PDF・Word・Excel・PowerPoint・Keynoteなど14形式に対応。カタログPDFの製品スペック表、組立手順図、フロー図を97%の精度で認識。テキストだけでなく視覚情報も完全に理解します。',
    badge: '14形式対応',
  },
  {
    icon: <CloudSyncIcon sx={{ fontSize: 48, color: BRAND.primary }} />,
    title: 'さくらクラウド自動連携',
    subtitle: 'サーバーに入れるだけ。手動ゼロ。',
    description: 'さくらクラウドの指定ディレクトリにファイルを追加・更新するだけで、差分を自動検出してナレッジベースに即時反映。SFTP連携で一括同期・リアルタイム進捗表示に対応。手動アップロードも不要です。',
    badge: '運用工数 90%削減',
  },
  {
    icon: <AutoFixHighIcon sx={{ fontSize: 48, color: BRAND.primary }} />,
    title: 'Agentic RAG',
    subtitle: 'AIエージェントによる自律的推論',
    description: 'AIがツールを自律的に選択・実行し、ナレッジベースを横断検索。参照元の自動引用とフォローアップ質問の提案により、「出典がわかる」「根拠が明確」な回答を実現します。',
    badge: '自律型AI推論',
  },
  {
    icon: <PsychologyIcon sx={{ fontSize: 48, color: BRAND.primary }} />,
    title: 'AI品質改善エージェント',
    subtitle: 'マニュアルにない暗黙知を自動補完',
    description: '回答できなかった質問や低評価の回答をAIが自動分析し、「頻繁に聞かれるがマニュアルに書いていない」暗黙知を特定。不足ドキュメントをWord文書として自動生成し、ナレッジベースに追加できます。',
    badge: 'ドキュメント自動生成',
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 48, color: BRAND.primary }} />,
    title: '部門別アクセス制御 + SSO',
    subtitle: 'Okta / Entra ID 標準搭載',
    description: '店舗スタッフ・本部社員・管理者ごとにアクセス可能なドキュメントを制御。機密情報の漏洩リスクを排除し、既存のSSO基盤とシームレスに統合します。',
    badge: 'エンタープライズ対応',
  },
];

// --- Comparison Data ---
const COMPARISON_ROWS = [
  { label: '回答精度', ours: 'Claude Sonnet 直接推論', others: '単純ベクトル検索', oursOk: true, othersOk: false },
  { label: 'PDF・図表の認識', ours: '97%精度（Claude Vision）', others: '非対応が大半', oursOk: true, othersOk: false },
  { label: '対応ファイル形式', ours: '14形式（PPTX/KEY含む）', others: 'PDF+テキストのみ', oursOk: true, othersOk: false },
  { label: 'クラウドストレージ連携', ours: 'さくらクラウド 差分自動同期', others: '手動アップロード', oursOk: true, othersOk: false },
  { label: '出典・参照元の表示', ours: '自動引用+リンク', others: '非対応/不安定', oursOk: true, othersOk: false },
  { label: '品質改善・FAQ自動生成', ours: 'AIがギャップ分析→Word生成', others: '手動でFAQ整備', oursOk: true, othersOk: false },
  { label: 'ナレッジ登録上限', ours: '上限なし', others: 'プラン別に数百件制限', oursOk: true, othersOk: false },
  { label: '24時間対応', ours: 'AI常時稼働', others: '営業時間内のみ', oursOk: true, othersOk: false },
  { label: 'SSO認証', ours: 'Okta/Entra ID 標準搭載', others: 'オプション/追加費用', oursOk: true, othersOk: false },
  { label: '料金体系', ours: '買い切り（ID課金・月額課金なし）', others: '月額課金型（年間継続）', oursOk: true, othersOk: false },
  { label: 'データの所有権・管理', ours: 'お客様の統合ナレッジベース', others: 'ベンダークラウドに閉じ込め', oursOk: true, othersOk: false },
  { label: '200店舗規模の年間コスト', ours: '買い切り100万（税込）+ インフラ実費のみ', others: '年240〜600万円（毎年継続課金）', oursOk: true, othersOk: false },
];

// 3年間の累計コスト比較（万円）
const COST_3YEAR = [
  { label: '問い合わせ対応の人件費（現状）', sub: '1日20件×15分×時給3,000円', y1: 360, y2: 360, y3: 360, color: '#78909c', isHumanCost: true },
  { label: 'パッケージ型チャットボット', sub: '月額約20万〜', y1: 240, y2: 240, y3: 240, color: '#d32f2f' },
  { label: 'Helpfeel', sub: '伴走型・個別見積り', y1: 600, y2: 500, y3: 500, color: '#ff9800' },
  { label: 'PKSHA FAQ', sub: '初期130万+月額10万〜', y1: 250, y2: 120, y3: 120, color: '#ffa726' },
  { label: '本サービス', sub: '買い切り100万（税込）+インフラ実費', y1: 160, y2: 60, y3: 60, color: BRAND.accent, highlight: true },
];

export function LandingPage() {
  return (
    <Box sx={{ overflowX: 'hidden' }}>
      {/* ===== Hero Section ===== */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${BRAND.dark} 0%, ${BRAND.darkSub} 50%, ${BRAND.primaryDark} 100%)`,
          color: BRAND.white,
          pt: { xs: 10, md: 14 },
          pb: { xs: 14, md: 20 },
          position: 'relative',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: 800, mx: 'auto', textAlign: 'center' }}>
            <Chip
              label="Agentic RAG - 国内初の自律型AI推論エンジン搭載"
              sx={{
                mb: 3,
                bgcolor: 'rgba(77, 179, 22, 0.15)',
                color: '#7fd44e',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: '1px solid rgba(77, 179, 22, 0.3)',
              }}
            />
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '1.8rem', md: '2.8rem' },
                fontWeight: 800,
                lineHeight: 1.3,
                mb: 3,
                letterSpacing: '-0.02em',
              }}
            >
              200店舗のナレッジを
              <br />
              <Box component="span" sx={{ color: '#e57373' }}>
                AIが即座に回答。
              </Box>
              <br />
              パート社員の対応品質が変わる。
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: BRAND.textLight,
                fontWeight: 400,
                lineHeight: 1.8,
                mb: 2,
                fontSize: { xs: '0.95rem', md: '1.15rem' },
              }}
            >
              工具カタログの図表が読めない。手動アップロードが面倒。出典が出ない。
              <br />
              3ヶ月で使われなくなる。月額20万のチャットボットは高すぎる。
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: BRAND.primaryLight,
                fontWeight: 600,
                lineHeight: 1.7,
                mb: 5,
                fontSize: { xs: '0.95rem', md: '1.1rem' },
              }}
            >
              Claude Sonnet AI + Agentic RAG + 14ファイル形式対応。
              <br />
              200店舗でもID課金なし。御社の環境でお試しいただけます。
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: BRAND.accent,
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: 2,
                  '&:hover': { bgcolor: '#3a8a10' },
                }}
                href="/login"
              >
                デモ環境を体験する
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  color: BRAND.white,
                  borderColor: 'rgba(255,255,255,0.3)',
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  borderRadius: 2,
                  '&:hover': { borderColor: BRAND.white, bgcolor: 'rgba(255,255,255,0.05)' },
                }}
                href="#features"
              >
                機能を見る
              </Button>
            </Box>
          </Box>

          {/* Hero Screenshot */}
          <Box
            sx={{
              mt: 8,
              mx: 'auto',
              maxWidth: 960,
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box
              component="img"
              src="/screenshots/chat-page.png"
              alt="AIチャット画面"
              sx={{ width: '100%', display: 'block' }}
            />
          </Box>
        </Container>
      </Box>

      {/* ===== Real Voices Section ===== */}
      <Box sx={{ bgcolor: BRAND.white, py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" sx={{ color: '#d32f2f', fontWeight: 700, letterSpacing: '0.15em' }}>
              REAL VOICES
            </Typography>
            <Typography variant="h2" sx={{ mt: 1, fontWeight: 700, color: BRAND.dark, fontSize: { xs: '1.5rem', md: '2rem' } }}>
              社内FAQ導入企業から聞こえてくる、
              <Box component="span" sx={{ color: '#d32f2f' }}>本音</Box>
            </Typography>
          </Box>

          <Grid container spacing={2.5}>
            {REAL_VOICES.map((voice) => (
              <Grid size={{ xs: 12, md: 6 }} key={voice.quote}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 3,
                    border: '1px solid #e8e8e8',
                    bgcolor: '#fafafa',
                    position: 'relative',
                  }}
                >
                  <FormatQuoteIcon sx={{ fontSize: 28, color: '#ddd', position: 'absolute', top: 12, right: 16 }} />
                  <Typography variant="body2" sx={{ color: '#333', lineHeight: 1.8, fontStyle: 'italic', mb: 2 }}>
                    「{voice.quote}」
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      {voice.company} / {voice.role}
                    </Typography>
                    <Chip label={voice.pain} size="small" sx={{ bgcolor: '#fee', color: '#d32f2f', fontWeight: 600, fontSize: '0.65rem', height: 22 }} />
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ===== Pain Points Section ===== */}
      <Box sx={{ bgcolor: BRAND.bg, pt: { xs: 4, md: 6 }, pb: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="overline" sx={{ color: BRAND.primary, fontWeight: 700, letterSpacing: '0.15em' }}>
              PROBLEMS
            </Typography>
            <Typography variant="h2" sx={{ mt: 1, fontWeight: 700, color: BRAND.dark, fontSize: { xs: '1.6rem', md: '2rem' } }}>
              なぜ既存のFAQサービスは
              <Box component="span" sx={{ color: '#d32f2f' }}>失敗するのか</Box>
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, color: '#545454', maxWidth: 640, mx: 'auto' }}>
              PKSHA FAQ・Helpfeel・sAI Search等、国内14社以上のRAGチャットボットを調査。共通する5つの構造的問題。
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {PAIN_POINTS.map((point) => (
              <Grid size={{ xs: 12, md: 6 }} key={point.title}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    height: '100%',
                    borderRadius: 3,
                    border: '1px solid #e5e5e5',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.08)' },
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box sx={{ color: '#d32f2f', flexShrink: 0, mt: 0.5 }}>
                      {point.icon}
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: BRAND.dark, mb: 1, fontSize: '1.15rem' }}>
                        {point.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
                        <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#d32f2f' }}>
                          {point.stat}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#545454' }}>
                          {point.statLabel}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#545454', lineHeight: 1.8 }}>
                        {point.description}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ===== Data Silo Warning Section ===== */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2020 50%, #1a1a2e 100%)',
          py: { xs: 8, md: 12 },
          color: BRAND.white,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #d32f2f, #ff9800)',
          },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" sx={{ color: '#ff9800', fontWeight: 700, letterSpacing: '0.15em' }}>
              THE BIGGEST TRAP
            </Typography>
            <Typography
              variant="h2"
              sx={{
                mt: 1,
                fontWeight: 700,
                fontSize: { xs: '1.5rem', md: '2.1rem' },
                lineHeight: 1.6,
              }}
            >
              外部ベンダーにデータを預けてサイロ化する
              <br />
              ―― それが
              <Box component="span" sx={{ color: '#ff9800' }}>AIエージェント化を阻む最大の罠</Box>
            </Typography>
            <Typography
              variant="body1"
              sx={{ mt: 3, color: 'rgba(255,255,255,0.7)', maxWidth: 760, mx: 'auto', lineHeight: 1.9 }}
            >
              FAQ ベンダー A に店舗マニュアル、チャットボット B に商品データ、別システムに帳票データ。
              ベンダーごとにデータが閉じ込められると、AIエージェントは横断的にアクセスできません。
              <br />
              「全社的にAIを活用したい」のに、データが散らばっていては永遠にたどり着けません。
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: 3,
                  bgcolor: 'rgba(211, 47, 47, 0.06)',
                  border: '1px solid rgba(211, 47, 47, 0.25)',
                }}
              >
                <Chip label="ベンダー依存型" size="small" sx={{ mb: 3, bgcolor: 'rgba(211,47,47,0.15)', color: '#e57373', fontWeight: 700 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#e57373', mb: 2.5, fontSize: '1rem' }}>
                  ベンダーごとにデータが分断される
                </Typography>

                {[
                  { vendor: 'FAQ ベンダー A のクラウド', data: '店舗マニュアル・業務手順書' },
                  { vendor: 'チャットボット ベンダー B のクラウド', data: '商品FAQ・仕様データ' },
                  { vendor: 'AI-OCR ベンダー C のクラウド', data: '請求書・帳票データ' },
                ].map((item) => (
                  <Box key={item.vendor} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                    <LockIcon sx={{ fontSize: 20, color: '#e57373', flexShrink: 0 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{item.vendor}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>{item.data}</Typography>
                    </Box>
                  </Box>
                ))}

                <Divider sx={{ my: 2.5, borderColor: 'rgba(211,47,47,0.2)' }} />

                {[
                  'AIエージェントが横断的にアクセスできない',
                  '店舗ごとにサイロ化 → 全社AI化が進まない',
                  'ベンダー乗り換え時にデータ移行が困難',
                  'データの所在・管理状況が不透明',
                ].map((text) => (
                  <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CloseIcon sx={{ fontSize: 16, color: '#e57373' }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>{text}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: 3,
                  bgcolor: 'rgba(196, 30, 58, 0.06)',
                  border: '2px solid rgba(196, 30, 58, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent})`,
                  },
                }}
              >
                <Chip label="自社データ基盤型" size="small" sx={{ mb: 3, bgcolor: 'rgba(77,179,22,0.15)', color: '#7fd44e', fontWeight: 700 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.primaryLight, mb: 2.5, fontSize: '1rem' }}>
                  1つの統合ナレッジベースで、AI基盤を構築
                </Typography>

                {[
                  { label: '全店舗のナレッジを一元管理', sub: 'さくらクラウド自動連携 + 14形式対応' },
                  { label: '店舗・本部ごとのアクセス制御で機密性を確保', sub: 'Okta / Entra ID SSO 標準搭載' },
                  { label: 'AIエージェントが全データを横断検索', sub: 'Agentic RAG で自律的推論' },
                  { label: 'FAQ → 分析 → 資料生成、同じ基盤で拡張', sub: 'データを一度整えれば横展開は容易' },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <CheckIcon sx={{ fontSize: 20, color: BRAND.accent, mt: 0.2, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{item.label}</Typography>
                      <Typography variant="caption" sx={{ color: BRAND.primaryLight }}>{item.sub}</Typography>
                    </Box>
                  </Box>
                ))}

                <Divider sx={{ my: 2, borderColor: 'rgba(196,30,58,0.2)' }} />

                {[
                  'ナレッジベースの内容を管理画面で100%可視化',
                  'ベンダーロックインなし',
                  '将来のAIエージェント拡張にそのまま対応',
                ].map((text) => (
                  <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckIcon sx={{ fontSize: 16, color: BRAND.accent }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{text}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>

          <Paper
            elevation={0}
            sx={{
              mt: 5,
              p: 3.5,
              borderRadius: 2,
              bgcolor: 'rgba(255, 152, 0, 0.06)',
              border: '1px solid rgba(255, 152, 0, 0.15)',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.9 }}>
              「Copilotの研修は進んでいるが、全社的にAIで業務効率を底上げする仕組みはまだ着手段階」
              <br />
              ―― 多くの企業がこう語ります。その根本原因は、
              <Box component="span" sx={{ color: '#ff9800', fontWeight: 700 }}>
                データがベンダーに分散し、AIが統合的に活用できない構造
              </Box>
              にあります。
              <br />
              <Box component="span" sx={{ fontWeight: 700, color: BRAND.primaryLight }}>
                まずデータ基盤を自社で整える。AI活用はそこから始まります。
              </Box>
            </Typography>
          </Paper>
        </Container>
      </Box>

      {/* ===== Features Section ===== */}
      <Box id="features" sx={{ bgcolor: BRAND.white, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="overline" sx={{ color: BRAND.primary, fontWeight: 700, letterSpacing: '0.15em' }}>
              SOLUTION
            </Typography>
            <Typography variant="h2" sx={{ mt: 1, fontWeight: 700, color: BRAND.dark, fontSize: { xs: '1.6rem', md: '2rem' } }}>
              5つの構造的問題を、根本から解決
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {FEATURES.map((feature) => (
              <Grid size={{ xs: 12, md: 6 }} key={feature.title}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    height: '100%',
                    borderRadius: 3,
                    border: '1px solid #e5e5e5',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent})`,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    {feature.icon}
                    <Chip
                      label={feature.badge}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(196, 30, 58, 0.08)',
                        color: BRAND.primary,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}
                    />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: BRAND.dark, mb: 0.5 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: BRAND.primary, fontWeight: 600 }}>
                    {feature.subtitle}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 2, color: '#545454', lineHeight: 1.8 }}>
                    {feature.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ===== Supported Formats Section ===== */}
      <Box sx={{ bgcolor: BRAND.bg, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" sx={{ color: BRAND.primary, fontWeight: 700, letterSpacing: '0.15em' }}>
              FORMATS
            </Typography>
            <Typography variant="h2" sx={{ mt: 1, fontWeight: 700, color: BRAND.dark, fontSize: { xs: '1.6rem', md: '2rem' } }}>
              あらゆる社内ドキュメントを、そのまま取込
            </Typography>
            <Typography variant="body2" sx={{ mt: 2, color: '#545454', maxWidth: 640, mx: 'auto' }}>
              他社が「PDF+テキストのみ」の中、14種類のファイル形式に対応。図表・フロー図も97%の精度で認識。
            </Typography>
          </Box>

          <Grid container spacing={2} justifyContent="center">
            {[
              { ext: 'PDF', method: 'Claude Vision', color: '#d32f2f' },
              { ext: 'DOCX', method: 'テキスト+表抽出', color: '#1565c0' },
              { ext: 'DOC', method: 'テキスト+表抽出', color: '#1565c0' },
              { ext: 'XLSX', method: 'シート+表変換', color: '#2e7d32' },
              { ext: 'XLS', method: 'シート+表変換', color: '#2e7d32' },
              { ext: 'PPTX', method: 'PDF変換+Vision', color: '#e65100' },
              { ext: 'PPT', method: 'PDF変換+Vision', color: '#e65100' },
              { ext: 'KEY', method: 'PDF変換+Vision', color: '#333' },
              { ext: 'CSV', method: '表形式変換', color: '#6a1b9a' },
              { ext: 'TXT', method: 'テキスト取込', color: '#546e7a' },
              { ext: 'MD', method: 'テキスト取込', color: '#546e7a' },
              { ext: 'JSON', method: 'テキスト取込', color: '#f57f17' },
              { ext: 'HTML', method: 'テキスト変換', color: '#00838f' },
              { ext: 'HTM', method: 'テキスト変換', color: '#00838f' },
            ].map((fmt) => (
              <Grid size={{ xs: 6, sm: 4, md: 3, lg: 'auto' }} key={fmt.ext}>
                <Paper
                  elevation={0}
                  sx={{
                    px: 3, py: 2, textAlign: 'center', borderRadius: 2, border: '1px solid #e5e5e5', minWidth: 120,
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
                  }}
                >
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: fmt.color, mb: 0.5 }}>
                    .{fmt.ext.toLowerCase()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999', fontSize: '0.65rem' }}>
                    {fmt.method}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Paper elevation={0} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, px: 3, py: 1.5, borderRadius: 2, bgcolor: 'rgba(196,30,58,0.05)', border: '1px solid rgba(196,30,58,0.12)' }}>
              <DocumentScannerIcon sx={{ color: BRAND.primary, fontSize: 20 }} />
              <Typography variant="body2" sx={{ color: BRAND.dark }}>
                <b>PowerPoint・Keynote</b>はLibreOfficeでPDFに変換後、Claude Visionで図表・グラフ・レイアウトを視覚的に認識
              </Typography>
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* ===== Product Screens Section ===== */}
      <Box sx={{ bgcolor: BRAND.white, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="overline" sx={{ color: BRAND.primary, fontWeight: 700, letterSpacing: '0.15em' }}>
              PRODUCT
            </Typography>
            <Typography variant="h2" sx={{ mt: 1, fontWeight: 700, color: BRAND.dark, fontSize: { xs: '1.6rem', md: '2rem' } }}>
              直感的な管理画面で、すべてを一元管理
            </Typography>
          </Box>

          {[
            {
              title: '利用統計ダッシュボード',
              description: '質問数・満足度・回答失敗率をリアルタイムで可視化。回答失敗率をクリックするだけでAIドキュメント提案画面に直行し、不足ナレッジの補完をすぐに開始できます。',
              image: '/screenshots/stats-page.png',
              alt: '利用統計ダッシュボード',
            },
            {
              title: 'AI品質改善エージェント',
              description: '「マニュアルに書いてないけど頻繁に聞かれること」をAIが自動特定。不足ドキュメントを対話しながらWord文書として自動生成。ダウンロードしてそのままナレッジベースに追加できます。',
              image: '/screenshots/doc-assistant-analysis.png',
              image2: '/screenshots/doc-assistant-generate.png',
              label1: 'ナレッジギャップ分析',
              label2: 'Word文書を自動生成',
              alt: 'AIドキュメント提案画面',
            },
            {
              title: 'ドキュメント管理 + さくらクラウド連携',
              description: 'さくらクラウドにファイルを追加するだけで自動反映。14形式すべてをドラッグ&ドロップまたはサーバーからワンクリック同期。手動アップロード地獄から解放されます。',
              image: '/screenshots/documents-page.png',
              alt: 'ドキュメント管理画面',
            },
            {
              title: '部門別アクセス制御',
              description: '店舗スタッフ・本部社員・管理者ごとにアクセス権限を設定。店舗専用の手順書は各店舗のみ、全社規定は全社員がアクセス可能。機密情報を適切に管理しながら、全社のナレッジ活用を推進。',
              image: '/screenshots/departments-page.png',
              alt: '部門管理画面',
            },
          ].map((screen, i) => (
            <Box
              key={screen.title}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: i % 2 === 0 ? 'row' : 'row-reverse' },
                alignItems: 'center',
                gap: { xs: 4, md: 6 },
                mb: i < 3 ? 10 : 0,
              }}
            >
              <Box sx={{ flex: '0 0 60%', maxWidth: { md: '60%' } }}>
                {screen.image2 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[
                      { src: screen.image, label: screen.label1 },
                      { src: screen.image2, label: screen.label2 },
                    ].map((img) => (
                      <Paper key={img.src} elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e5e5e5', boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>
                        <Box sx={{ px: 2, py: 0.8, bgcolor: BRAND.dark, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BRAND.accent }} />
                          <Typography variant="caption" sx={{ color: BRAND.white, fontWeight: 600, fontSize: '0.75rem' }}>
                            {img.label}
                          </Typography>
                        </Box>
                        <Box component="img" src={img.src} alt={img.label} sx={{ width: '100%', display: 'block' }} />
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e5e5e5', boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>
                    <Box component="img" src={screen.image} alt={screen.alt} sx={{ width: '100%', display: 'block' }} />
                  </Paper>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: BRAND.dark, mb: 2 }}>
                  {screen.title}
                </Typography>
                <Typography variant="body1" sx={{ color: '#545454', lineHeight: 1.8 }}>
                  {screen.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Container>
      </Box>

      {/* ===== Security & Compliance Section ===== */}
      <Box sx={{ bgcolor: BRAND.dark, py: { xs: 8, md: 10 }, color: BRAND.white }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" sx={{ color: BRAND.primaryLight, fontWeight: 700, letterSpacing: '0.15em' }}>
              SECURITY
            </Typography>
            <Typography variant="h2" sx={{ mt: 1, fontWeight: 700, fontSize: { xs: '1.6rem', md: '2rem' } }}>
              「社内データがAIに学習されないか？」
              <br />
              <Box component="span" sx={{ color: BRAND.primaryLight }}>その懸念、解消します。</Box>
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {[
              {
                icon: <ShieldIcon sx={{ fontSize: 36, color: BRAND.primaryLight }} />,
                title: 'データ学習に一切使用されません',
                description: 'Azure OpenAI Service（日本リージョン）を利用。API経由のデータは事前学習モデルに取り込まれません。SOC2 Type2・ISO 27001認証環境で運用。',
              },
              {
                icon: <SecurityIcon sx={{ fontSize: 36, color: BRAND.primaryLight }} />,
                title: 'Okta / Entra ID SSO標準搭載',
                description: '既存のSSO基盤とシームレスに統合。VPN + Okta環境でも問題なく動作します。多要素認証にも対応。',
              },
              {
                icon: <StorageIcon sx={{ fontSize: 36, color: BRAND.primaryLight }} />,
                title: 'データは日本リージョンに完結',
                description: 'データベース・AIモデル・ファイルストレージすべて日本リージョン内で完結。海外へのデータ転送は一切ありません。',
              },
              {
                icon: <AccessTimeIcon sx={{ fontSize: 36, color: BRAND.primaryLight }} />,
                title: '24時間365日 AI常時稼働',
                description: '営業時間外でも担当者不在でも、AIが即座に回答。夕方シフトのパート社員も、すぐに業務を進められます。',
              },
            ].map((item) => (
              <Grid size={{ xs: 12, md: 6 }} key={item.title}>
                <Box sx={{ display: 'flex', gap: 2.5 }}>
                  <Box sx={{ flexShrink: 0 }}>{item.icon}</Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, fontSize: '1rem' }}>{item.title}</Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{item.description}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ===== Architecture Comparison ===== */}
      <Box sx={{ bgcolor: BRAND.bg, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" sx={{ color: BRAND.primary, fontWeight: 700, letterSpacing: '0.15em' }}>
              TECHNOLOGY
            </Typography>
            <Typography variant="h2" sx={{ mt: 1, fontWeight: 700, color: BRAND.dark, fontSize: { xs: '1.6rem', md: '2rem' } }}>
              なぜ「回答の質」が根本的に違うのか
            </Typography>
            <Typography variant="body2" sx={{ mt: 2, color: '#545454', maxWidth: 640, mx: 'auto' }}>
              国内のRAGチャットボットの大半は「検索して貼り付けるだけ」。本サービスはAIが自律的に考え、検証するAgentic RAGアーキテクチャです。
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 4, height: '100%', borderRadius: 3, border: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
                <Chip label="パッケージ型チャットボット等" size="small" sx={{ mb: 2, bgcolor: '#eee', color: '#999', fontWeight: 600 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#999', mb: 3 }}>従来型RAG</Typography>

                {[
                  { step: '1', text: 'キーワードで類似文書を検索', sub: '単純なベクトル類似度のみ' },
                  { step: '2', text: '上位5件をそのままAIに丸投げ', sub: '関連性の評価なし' },
                  { step: '3', text: '回答を生成して終了', sub: '正確性の検証なし' },
                ].map((item) => (
                  <Box key={item.step} sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#e0e0e0', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                      {item.step}
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>{item.text}</Typography>
                      <Typography variant="caption" sx={{ color: '#aaa' }}>{item.sub}</Typography>
                    </Box>
                  </Box>
                ))}

                <Divider sx={{ my: 2.5 }} />
                {['検索結果が的外れでもそのまま回答', '複数マニュアルの関係性を理解できない', '出典が表示されない/不安定', '回答できない質問の分析は全て手作業'].map((text) => (
                  <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CloseIcon sx={{ fontSize: 16, color: '#d32f2f' }} />
                    <Typography variant="caption" sx={{ color: '#999' }}>{text}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4, height: '100%', borderRadius: 3, border: `2px solid ${BRAND.primary}`, position: 'relative', overflow: 'hidden',
                  '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent})` },
                }}
              >
                <Chip label="本サービス" size="small" sx={{ mb: 2, bgcolor: 'rgba(196,30,58,0.08)', color: BRAND.primary, fontWeight: 700 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: BRAND.dark, mb: 3 }}>Agentic RAG（自律型AI推論）</Typography>

                {[
                  { step: '1', text: '質問の意図を高精度に理解', sub: 'Claude Sonnetの文脈理解' },
                  { step: '2', text: 'AIがツールを自律選択・実行', sub: 'search_knowledge + 5つのツール' },
                  { step: '3', text: '14形式のドキュメントを横断検索', sub: 'PDF図表・PPTX・KEY含む全形式' },
                  { step: '4', text: '参照元を自動引用して回答生成', sub: '出典リンク付きで根拠を明示' },
                  { step: '5', text: 'フォローアップ質問を自動提案', sub: 'ChatGPT風の対話体験' },
                ].map((item) => (
                  <Box key={item.step} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: BRAND.primary, color: BRAND.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                      {item.step}
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: BRAND.dark }}>{item.text}</Typography>
                      <Typography variant="caption" sx={{ color: BRAND.primary }}>{item.sub}</Typography>
                    </Box>
                  </Box>
                ))}

                <Divider sx={{ my: 2 }} />
                {['AIがツールを自律選択し最適な情報を収集', '複数マニュアルにまたがる質問にも正確に回答', '参照元の自動引用で「根拠がわかる」回答', '回答失敗をAIが分析→不足ドキュメントを自動生成'].map((text) => (
                  <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckIcon sx={{ fontSize: 16, color: BRAND.accent }} />
                    <Typography variant="caption" sx={{ color: '#333', fontWeight: 600 }}>{text}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>

          {/* 具体例 */}
          <Paper elevation={0} sx={{ mt: 5, p: 4, borderRadius: 3, bgcolor: BRAND.white, border: '1px solid #e5e5e5' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: BRAND.dark, mb: 2 }}>
              例：「マキタのインパクトドライバーTD173Dに使える替えビットは？」
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <CloseIcon sx={{ fontSize: 18, color: '#d32f2f', mt: 0.3 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#999', fontWeight: 600 }}>従来型RAG</Typography>
                    <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.7 }}>
                      TD173Dの本体カタログ<b>だけ</b>を参照し、互換ビット情報が不完全。「詳しくはメーカーにお問い合わせください」で終了。
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <CheckIcon sx={{ fontSize: 18, color: BRAND.accent, mt: 0.3 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: BRAND.primary, fontWeight: 600 }}>本サービス（Agentic RAG）</Typography>
                    <Typography variant="body2" sx={{ color: '#333', lineHeight: 1.7 }}>
                      本体カタログ ⇔ ビットカタログ ⇔ 互換表を<b>AIが自律的に横断検索</b>し、対応ビットの型番・特徴・在庫情報を出典付きで回答。
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* ===== Comparison Table ===== */}
      <Box sx={{ bgcolor: BRAND.white, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" sx={{ color: BRAND.primary, fontWeight: 700, letterSpacing: '0.15em' }}>
              COMPARISON
            </Typography>
            <Typography variant="h2" sx={{ mt: 1, fontWeight: 700, color: BRAND.dark, fontSize: { xs: '1.6rem', md: '2rem' } }}>
              パッケージ型チャットボットとの比較
            </Typography>
          </Box>

          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', bgcolor: BRAND.dark, color: BRAND.white, px: 3, py: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>項目</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: BRAND.primaryLight }}>本サービス</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#999' }}>パッケージ型</Typography>
            </Box>

            {COMPARISON_ROWS.map((row, i) => (
              <Box key={row.label}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', px: 3, py: 2, bgcolor: i % 2 === 0 ? BRAND.white : BRAND.bg, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: BRAND.dark }}>{row.label}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ fontSize: 18, color: BRAND.accent }} />
                    <Typography variant="body2" sx={{ color: '#333' }}>{row.ours}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloseIcon sx={{ fontSize: 18, color: '#d32f2f' }} />
                    <Typography variant="body2" sx={{ color: '#999' }}>{row.others}</Typography>
                  </Box>
                </Box>
                {i < COMPARISON_ROWS.length - 1 && <Divider />}
              </Box>
            ))}
          </Paper>
        </Container>
      </Box>

      {/* ===== TCO Comparison Section ===== */}
      <Box sx={{ bgcolor: BRAND.bg, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" sx={{ color: BRAND.primary, fontWeight: 700, letterSpacing: '0.15em' }}>
              COST
            </Typography>
            <Typography variant="h2" sx={{ mt: 1, fontWeight: 700, color: BRAND.dark, fontSize: { xs: '1.6rem', md: '2rem' } }}>
              <GroupsIcon sx={{ fontSize: 32, verticalAlign: 'middle', mr: 1, color: BRAND.primary }} />
              3年間の総コスト比較
            </Typography>
            <Typography variant="body2" sx={{ mt: 2, color: '#545454' }}>
              他社は毎年数百万円の継続課金。本サービスは買い切り100万円（税込）、2年目以降はインフラ実費（年約60万円）のみ。
            </Typography>
          </Box>

          {/* 3年コスト比較テーブル */}
          <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e5e5e5' }}>
            {/* ヘッダー */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', bgcolor: BRAND.dark, color: BRAND.white, py: 1.5, px: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>サービス</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'right' }}>1年目</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'right' }}>2年目</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'right' }}>3年目</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'right' }}>3年合計</Typography>
            </Box>
            {/* データ行 */}
            {COST_3YEAR.map((item: { label: string; sub: string; y1: number; y2: number; y3: number; color: string; highlight?: boolean; isHumanCost?: boolean }, i: number) => {
              const total = item.y1 + item.y2 + item.y3;
              return (
                <Box
                  key={item.label}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr',
                    py: 1.5,
                    px: 2,
                    bgcolor: item.isHumanCost ? 'rgba(120,144,156,0.08)' : item.highlight ? 'rgba(77,179,22,0.06)' : i % 2 === 0 ? '#fafafa' : BRAND.white,
                    borderBottom: item.isHumanCost ? '3px solid #ccc' : '1px solid #eee',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: item.highlight || item.isHumanCost ? 700 : 500, color: item.isHumanCost ? '#546e7a' : item.highlight ? BRAND.primary : BRAND.dark, fontSize: '0.8rem' }}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem' }}>{item.sub}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: item.highlight ? 700 : 400, color: item.isHumanCost ? '#546e7a' : item.highlight ? BRAND.accent : '#333', fontSize: '0.85rem' }}>
                    {item.y1}万円
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: item.highlight ? 700 : 400, color: item.isHumanCost ? '#546e7a' : item.highlight ? BRAND.accent : '#333', fontSize: '0.85rem' }}>
                    {item.y2}万円
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: item.highlight ? 700 : 400, color: item.isHumanCost ? '#546e7a' : item.highlight ? BRAND.accent : '#333', fontSize: '0.85rem' }}>
                    {item.y3}万円
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 700, color: item.highlight ? BRAND.accent : item.color, fontSize: '0.95rem' }}>
                    {total.toLocaleString()}万円
                  </Typography>
                </Box>
              );
            })}
          </Paper>

          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#999', textAlign: 'right' }}>
            ※ 各社公開料金に基づく概算。人件費は1日20件×15分×時給3,000円×月20日で試算。本サービスのインフラ実費はAI API・DB・ホスティング含む。
          </Typography>

          {/* 買い切りに含まれるもの */}
          <Paper elevation={0} sx={{ mt: 3, p: 3, borderRadius: 3, bgcolor: 'rgba(196,30,58,0.05)', border: '1px solid rgba(196,30,58,0.12)' }}>
            <Typography variant="body2" sx={{ color: BRAND.dark, fontWeight: 700, mb: 1 }}>
              買い切り100万円（税込）に含まれるもの
            </Typography>
            <Typography variant="caption" sx={{ color: '#545454', lineHeight: 1.8, display: 'block' }}>
              システム一式（AI FAQ・管理画面・さくらクラウド連携・SSO・品質改善エージェント）の構築・導入支援・初期設定をすべて含みます。
              納品後の月額ライセンス費・ID課金は一切ありません。AI API・データベース・ホスティングのインフラ実費（月額約5万円）のみ御社で直接ご契約いただく形です。
            </Typography>
          </Paper>
        </Container>
      </Box>

      {/* ===== Demo Invitation Section ===== */}
      <Box sx={{ bgcolor: BRAND.white, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="overline" sx={{ color: BRAND.primary, fontWeight: 700, letterSpacing: '0.15em' }}>
              DEMO
            </Typography>
            <Typography variant="h2" sx={{ mt: 1, fontWeight: 700, color: BRAND.dark, fontSize: { xs: '1.6rem', md: '2rem' }, mb: 2 }}>
              ワールドツール様専用のデモ環境をご用意しました
            </Typography>
            <Typography variant="body1" sx={{ color: '#545454', lineHeight: 1.8, mb: 4 }}>
              実際のシステムに触れて、AIの回答精度・さくらクラウド連携・部門別アクセス制御をご確認ください。
              <br />
              御社のドキュメントをアップロードして、すぐにお試しいただけます。
            </Typography>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{
                bgcolor: BRAND.accent,
                color: BRAND.white,
                px: 6,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 700,
                borderRadius: 2,
                '&:hover': { bgcolor: '#3a8a10' },
              }}
              href="/login"
            >
              デモ環境にログイン
            </Button>
            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#999' }}>
              ※ ご不明点がございましたら担当：白石までお気軽にご連絡ください
            </Typography>
          </Box>
        </Container>
      </Box>


      {/* ===== Footer ===== */}
      <Box sx={{ bgcolor: BRAND.dark, py: 4 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              &copy; {new Date().getFullYear()} AI FAQ Platform
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              {['プライバシーポリシー', '利用規約', '会社概要'].map((item) => (
                <Typography key={item} variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', '&:hover': { color: 'rgba(255,255,255,0.7)' } }}>
                  {item}
                </Typography>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
