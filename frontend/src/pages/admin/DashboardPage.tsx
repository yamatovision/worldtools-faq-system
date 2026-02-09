import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Tooltip,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import CloudIcon from '@mui/icons-material/Cloud';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { WT_COLORS } from '@/theme';
import { getDashboardData } from '@/services/api/stats';
import type { WeeklyMetrics } from '@/types';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const HOUR_LABELS = ['0', '3', '6', '9', '12', '15', '18', '21'];

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function PositiveTrendIcon({ current, previous }: { current: number; previous: number }) {
  if (current > previous) return <TrendingUpIcon sx={{ fontSize: 16, color: WT_COLORS.success }} />;
  if (current < previous) return <TrendingDownIcon sx={{ fontSize: 16, color: WT_COLORS.error }} />;
  return <TrendingFlatIcon sx={{ fontSize: 16, color: WT_COLORS.text.secondary }} />;
}

function NegativeTrendIcon({ current, previous }: { current: number; previous: number }) {
  if (current < previous) return <TrendingDownIcon sx={{ fontSize: 16, color: WT_COLORS.success }} />;
  if (current > previous) return <TrendingUpIcon sx={{ fontSize: 16, color: WT_COLORS.error }} />;
  return <TrendingFlatIcon sx={{ fontSize: 16, color: WT_COLORS.text.secondary }} />;
}

function Sparkline({ data, dataKey, color, height = 40 }: {
  data: { date: string; [key: string]: number | string }[];
  dataKey: string;
  color: string;
  height?: number;
}) {
  if (!data.length) return null;
  const values = data.map((d) => (d[dataKey] as number) || 0);
  const max = Math.max(...values, 1);

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height }}>
      {values.map((v, i) => (
        <Tooltip key={i} title={`${data[i].date}: ${v}`} arrow placement="top">
          <Box
            sx={{
              flex: 1,
              height: `${Math.max((v / max) * height, 2)}px`,
              backgroundColor: color,
              borderRadius: '2px 2px 0 0',
              opacity: 0.8,
              transition: 'height 0.3s',
              '&:hover': { opacity: 1 },
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
}

function WeeklyComparisonBanner({ thisWeek, lastWeek }: { thisWeek: WeeklyMetrics; lastWeek: WeeklyMetrics }) {
  const diff = thisWeek.questions - lastWeek.questions;
  const diffLabel = diff > 0 ? `+${diff}` : `${diff}`;

  return (
    <Paper sx={{ p: 2.5, mb: 3, background: `linear-gradient(135deg, ${WT_COLORS.primary}08, ${WT_COLORS.primary}14)` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            今週の質問数
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {thisWeek.questions}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              件
            </Typography>
            {lastWeek.questions > 0 && (
              <Chip
                size="small"
                label={`前週比 ${diffLabel}`}
                sx={{
                  backgroundColor: diff >= 0 ? `${WT_COLORS.success}20` : `${WT_COLORS.text.secondary}15`,
                  color: diff >= 0 ? WT_COLORS.success : WT_COLORS.text.secondary,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">利用ユーザー</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{thisWeek.activeUsers}人</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">前週</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{lastWeek.questions}件 / {lastWeek.activeUsers}人</Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboardData,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Alert severity="error">ダッシュボードの読み込みに失敗しました</Alert>
      </MainLayout>
    );
  }

  if (!data) return null;

  const { weeklyComparison, sparklineData, heatmap, topReferencedDocs, infrastructure, recentDocuments } = data;
  const tw = weeklyComparison.thisWeek;
  const lw = weeklyComparison.lastWeek;

  const heatmapMax = Math.max(...heatmap.flat(), 1);

  const maxCoverage = infrastructure.dataCoverage.length
    ? Math.max(...infrastructure.dataCoverage.map((d) => d.documentCount), 1)
    : 1;

  return (
    <MainLayout>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          ダッシュボード
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          利用状況とデータ基盤の概要
        </Typography>

        {/* 週次サマリーバナー */}
        <WeeklyComparisonBanner thisWeek={tw} lastWeek={lw} />

        {/* KPIカード2枚 + スパークライン */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* 満足度 → 回答品質へ */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              sx={{ p: 2.5, cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}
              onClick={() => navigate('/admin/quality')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">満足度</Typography>
                <PositiveTrendIcon current={tw.satisfactionRate} previous={lw.satisfactionRate} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: tw.feedbackCount === 0 ? WT_COLORS.text.secondary : tw.satisfactionRate >= 80 ? WT_COLORS.success : tw.satisfactionRate >= 50 ? WT_COLORS.warning : WT_COLORS.error }}>
                  {tw.feedbackCount > 0 ? `${tw.satisfactionRate}%` : '-'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  （評価 {tw.feedbackCount}件）
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                前週 {lw.feedbackCount > 0 ? `${lw.satisfactionRate}%` : '-'}（{lw.feedbackCount}件）
              </Typography>
              <Box sx={{ mt: 1.5 }}>
                <Sparkline data={sparklineData} dataKey="good" color={WT_COLORS.success} />
              </Box>
            </Paper>
          </Grid>

          {/* 回答失敗率 → ドキュメント提案へ */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              sx={{ p: 2.5, cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}
              onClick={() => navigate('/admin/doc-assistant')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">回答失敗率</Typography>
                <NegativeTrendIcon current={tw.noAnswerRate} previous={lw.noAnswerRate} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: tw.noAnswerRate > 20 ? WT_COLORS.error : tw.noAnswerRate > 10 ? WT_COLORS.warning : WT_COLORS.text.primary }}>
                {tw.noAnswerRate}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                前週 {lw.noAnswerRate}%
              </Typography>
              <Box sx={{ mt: 1.5 }}>
                <Sparkline data={sparklineData} dataKey="noAnswer" color={WT_COLORS.warning} />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* ヒートマップ + TOP引用ドキュメント */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* 利用ヒートマップ */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                利用ヒートマップ（直近30日）
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {/* 曜日ラベル */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px', mr: 0.5, pt: '20px' }}>
                  {DAY_LABELS.map((label) => (
                    <Typography key={label} variant="caption" sx={{ fontSize: '0.6rem', height: 18, lineHeight: '18px', textAlign: 'right' }}>
                      {label}
                    </Typography>
                  ))}
                </Box>
                {/* ヒートマップグリッド */}
                <Box sx={{ flex: 1 }}>
                  {/* 時間ラベル */}
                  <Box sx={{ display: 'flex', mb: '3px' }}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <Box key={h} sx={{ flex: 1, textAlign: 'center' }}>
                        {HOUR_LABELS.includes(String(h)) && (
                          <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>
                            {h}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                  {/* セル */}
                  {heatmap.map((row, dow) => (
                    <Box key={dow} sx={{ display: 'flex', gap: '3px', mb: '3px' }}>
                      {row.map((cnt, hour) => {
                        const intensity = heatmapMax > 0 ? cnt / heatmapMax : 0;
                        return (
                          <Tooltip key={hour} title={`${DAY_LABELS[dow]} ${hour}時: ${cnt}件`} arrow>
                            <Box
                              sx={{
                                flex: 1,
                                height: 18,
                                borderRadius: 0.5,
                                backgroundColor: cnt === 0
                                  ? `${WT_COLORS.border}`
                                  : `rgba(10, 133, 188, ${0.15 + intensity * 0.85})`,
                                transition: 'background-color 0.2s',
                              }}
                            />
                          </Tooltip>
                        );
                      })}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* TOP引用ドキュメント */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                TOP引用ドキュメント（30日）
              </Typography>
              {topReferencedDocs.length > 0 ? (
                <List disablePadding>
                  {topReferencedDocs.map((doc, idx) => (
                    <ListItem key={doc.id} disablePadding sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: idx === 0 ? WT_COLORS.primary : WT_COLORS.text.secondary,
                            minWidth: 20,
                          }}
                        >
                          {idx + 1}
                        </Typography>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                            {doc.filename}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={`${doc.referenceCount}回`}
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        />
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  引用データがまだありません
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* データ基盤セクション */}
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, mt: 1 }}>
          データ基盤
        </Typography>
        <Grid container spacing={3}>
          {/* 部門別カバレッジ */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2.5, height: 280 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>部門別ドキュメント数</Typography>
              {infrastructure.dataCoverage.length > 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'flex-end', height: '75%', gap: 1 }}>
                  {infrastructure.dataCoverage.map((dept) => (
                    <Box key={dept.departmentName} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600 }}>
                        {dept.documentCount}
                      </Typography>
                      <Box
                        sx={{
                          width: '100%',
                          maxWidth: 48,
                          backgroundColor: dept.departmentName === '全社公開' ? WT_COLORS.primary : WT_COLORS.secondary,
                          height: `${Math.max((dept.documentCount / maxCoverage) * 120, 4)}px`,
                          borderRadius: '4px 4px 0 0',
                        }}
                      />
                      <Typography variant="caption" sx={{ mt: 0.5, fontSize: '0.6rem', textAlign: 'center' }}>
                        {dept.departmentName}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ height: '75%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">部門データなし</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* 最近のドキュメント */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>最近のドキュメント</Typography>
              {recentDocuments.length > 0 ? (
                <List disablePadding>
                  {recentDocuments.map((doc, idx) => (
                    <ListItem key={idx} divider={idx < recentDocuments.length - 1} sx={{ px: 0, py: 0.75 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {doc.source === 'box' ? <CloudIcon fontSize="small" color="info" /> : <UploadFileIcon fontSize="small" color="action" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={doc.filename}
                        secondary={`${doc.createdAt ? formatDate(doc.createdAt) : '-'} | ${doc.chunkCount}チャンク`}
                        primaryTypographyProps={{ fontSize: '0.85rem', noWrap: true }}
                        secondaryTypographyProps={{ fontSize: '0.7rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" sx={{ py: 2 }}>ドキュメント未登録</Typography>
              )}
            </Paper>
          </Grid>

          {/* 基盤情報 */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>基盤情報</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">ドキュメント / チャンク</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {infrastructure.documentCount} / {infrastructure.chunkCount}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">モデル</Typography>
                  <Chip label={infrastructure.embeddingModel} size="small" sx={{ mt: 0.5 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">BOX連携</Typography>
                  <Chip
                    icon={<DescriptionIcon />}
                    label={infrastructure.boxSync.configured ? `${infrastructure.boxSync.syncedFileCount}件同期` : '未設定'}
                    size="small"
                    color={infrastructure.boxSync.configured ? 'success' : 'default'}
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                {infrastructure.boxSync.lastSyncAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">最終同期</Typography>
                    <Typography variant="body2">{formatDate(infrastructure.boxSync.lastSyncAt)}</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
}
