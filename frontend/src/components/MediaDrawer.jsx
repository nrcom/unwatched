import { useState, useEffect } from 'react';
import {
  Drawer,
  Typography,
  Space,
  Tag,
  Button,
  Divider,
  Row,
  Col,
  Skeleton,
  Rate,
  Descriptions,
  Badge,
  Modal,
} from 'antd';
import {
  YoutubeOutlined,
  StarFilled,
  VideoCameraOutlined,
  DesktopOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { getMovieMetadata, getShowMetadata } from '../services/api';

const { Title, Text, Paragraph } = Typography;

function ratingBadge(label, value, color, isPercent = false) {
  if (value == null) return null;
  const display = isPercent ? `${Math.round(value)}%` : Number(value).toFixed(1);
  return (
    <Tag color={color} style={{ fontSize: 13, padding: '2px 8px' }}>
      {label}: {display}
    </Tag>
  );
}

function formatRuntime(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function MediaDrawer({ item, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);

  useEffect(() => {
    if (!item) {
      setDetail(null);
      return;
    }
    setDetail(null);
    setLoading(true);

    setEmbedBlocked(false);
    const fetchFn = item.type === 'movie' ? getMovieMetadata : getShowMetadata;
    fetchFn(item.id)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [item?.id, item?.type]);

  // Detect YouTube embed-disabled errors (101, 150, 153) via postMessage
  useEffect(() => {
    if (!trailerOpen) return;
    const handler = (e) => {
      try {
        const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (msg?.event === 'onError' && [100, 101, 150, 153].includes(msg?.info)) {
          setEmbedBlocked(true);
        }
      } catch (_) {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [trailerOpen]);

  const data = detail ?? item;

  // Radarr can return either a bare video ID or a full YouTube URL
  function extractYouTubeId(value) {
    if (!value) return null;
    try {
      const url = new URL(value);
      // youtube.com/watch?v=ID  or  youtu.be/ID
      return url.searchParams.get('v') ?? url.pathname.replace(/^\//, '') ?? null;
    } catch (_) {
      // Not a URL — treat the value itself as the ID
      return value;
    }
  }

  const youtubeId = extractYouTubeId(data?.youTubeTrailerId);
  const youtubeUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null;
  const youtubeSearchUrl =
    !youtubeId && data
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
          `${data.title} ${data.year} trailer`
        )}`
      : null;

  const ratings = data?.ratings ?? {};

  return (
    <Drawer
      open={!!item}
      onClose={onClose}
      width={520}
      styles={{
        header: { background: '#1a1a1a', borderBottom: '1px solid #2a2a2a' },
        body: { background: '#1a1a1a', padding: 0 },
        mask: { background: 'rgba(0,0,0,0.7)' },
      }}
      title={
        item ? (
          <Space>
            {item.type === 'movie' ? (
              <VideoCameraOutlined style={{ color: '#4096ff' }} />
            ) : (
              <DesktopOutlined style={{ color: '#9254de' }} />
            )}
            <span style={{ color: '#fff' }}>{item.title}</span>
            <Text type="secondary">({item.year})</Text>
          </Space>
        ) : null
      }
      destroyOnClose={false}
    >
      {item && youtubeId && (
        <Modal
          open={trailerOpen}
          onCancel={() => { setTrailerOpen(false); setEmbedBlocked(false); }}
          footer={null}
          title={<span style={{ color: '#fff' }}>{data?.title} — Trailer</span>}
          width={800}
          centered
          destroyOnClose
          styles={{
            content: { background: '#141414', padding: 0 },
            header: { background: '#141414', borderBottom: '1px solid #2a2a2a', padding: '12px 20px' },
            body: { padding: 0 },
          }}
        >
          {embedBlocked ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '48px 24px',
                color: '#aaa',
                textAlign: 'center',
              }}
            >
              <YoutubeOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
              <span>This video can't be embedded — watch it directly on YouTube.</span>
              <Button
                type="primary"
                danger
                icon={<YoutubeOutlined />}
                href={`https://www.youtube.com/watch?v=${youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch on YouTube
              </Button>
            </div>
          ) : (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&enablejsapi=1`}
                title={`${data?.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '0 0 8px 8px',
                }}
              />
            </div>
          )}
        </Modal>
      )}

      {item && (
        <div>
          {/* Hero / Poster */}
          <div style={{ display: 'flex', gap: 16, padding: 20, background: '#141414' }}>
            <img
              src={item.posterPath}
              alt={item.title}
              style={{
                width: 130,
                height: 195,
                objectFit: 'cover',
                borderRadius: 6,
                background: '#2a2a2a',
                flexShrink: 0,
              }}
              onError={(e) => {
                e.target.style.background = '#2a2a2a';
                e.target.src = '';
              }}
            />
            <div style={{ flex: 1 }}>
              <Title level={4} style={{ margin: '0 0 4px', color: '#fff' }}>
                {item.title}
              </Title>
              <Space wrap size={4} style={{ marginBottom: 8 }}>
                {item.type === 'movie' ? (
                  <Tag color="blue">Movie</Tag>
                ) : (
                  <Tag color="purple">Show</Tag>
                )}
                {item.certification && <Tag>{item.certification}</Tag>}
                {item.year && <Tag>{item.year}</Tag>}
                {item.type === 'show' && item.status && (
                  <Badge
                    status={item.status === 'continuing' ? 'processing' : 'default'}
                    text={<Text style={{ color: '#aaa', fontSize: 12 }}>{item.status}</Text>}
                  />
                )}
              </Space>

              {/* Ratings row */}
              {loading ? (
                <Skeleton.Input active size="small" style={{ width: 200, height: 24 }} />
              ) : (
                <Space wrap size={4} style={{ marginBottom: 8 }}>
                  {ratingBadge('TMDB', ratings.tmdb, 'gold')}
                  {ratingBadge('IMDb', ratings.imdb, 'orange')}
                  {ratingBadge('RT', ratings.rottenTomatoes, 'red', true)}
                  {ratingBadge('MC', ratings.metacritic, 'cyan', true)}
                  {ratingBadge('TVDB', ratings.tvdb, 'blue')}
                </Space>
              )}

              {/* Runtime / seasons */}
              <Space size={12} style={{ marginTop: 4 }}>
                {item.runtime ? (
                  <Space size={4}>
                    <ClockCircleOutlined style={{ color: '#888' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatRuntime(item.runtime)}
                    </Text>
                  </Space>
                ) : null}
                {item.type === 'show' && item.seasonCount ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.seasonCount} season{item.seasonCount !== 1 ? 's' : ''}
                    {item.episodeCount ? ` · ${item.episodeCount} ep` : ''}
                  </Text>
                ) : null}
              </Space>

              {/* Trailer button */}
              <div style={{ marginTop: 12 }}>
                {youtubeUrl ? (
                  <Button
                    type="primary"
                    danger
                    icon={<YoutubeOutlined />}
                    size="small"
                    onClick={() => setTrailerOpen(true)}
                  >
                    Watch Trailer
                  </Button>
                ) : (
                  <Button
                    icon={<YoutubeOutlined />}
                    href={youtubeSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                  >
                    Search Trailer
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Overview */}
          <div style={{ padding: '16px 20px' }}>
            <Text
              strong
              style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}
            >
              Overview
            </Text>
            {loading ? (
              <Skeleton active paragraph={{ rows: 3 }} title={false} style={{ marginTop: 8 }} />
            ) : (
              <Paragraph
                style={{ marginTop: 8, color: '#ccc', lineHeight: 1.7 }}
                ellipsis={{ rows: 6, expandable: true, symbol: 'more' }}
              >
                {data?.overview || 'No description available.'}
              </Paragraph>
            )}
          </div>

          <Divider style={{ borderColor: '#2a2a2a', margin: '0 20px' }} />

          {/* Genres */}
          {(data?.genres ?? []).length > 0 && (
            <div style={{ padding: '12px 20px' }}>
              <Text
                strong
                style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}
              >
                Genres
              </Text>
              <Space wrap size={4} style={{ marginTop: 8, display: 'flex' }}>
                {(data?.genres ?? []).map((g) => (
                  <Tag key={g} style={{ marginBottom: 4 }}>
                    {g}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          <Divider style={{ borderColor: '#2a2a2a', margin: '0 20px' }} />

          {/* Details */}
          <div style={{ padding: '12px 20px 20px' }}>
            <Text
              strong
              style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}
            >
              Details
            </Text>
            <Descriptions
              column={1}
              size="small"
              style={{ marginTop: 8 }}
              labelStyle={{ color: '#888', width: 120 }}
              contentStyle={{ color: '#ddd' }}
            >
              {(data?.studio || data?.network) && (
                <Descriptions.Item label={data?.type === 'movie' ? 'Studio' : 'Network'}>
                  {data.studio ?? data.network}
                </Descriptions.Item>
              )}
              {data?.type === 'movie' && data?.inCinemas && (
                <Descriptions.Item label="In Cinemas">
                  {formatDate(data.inCinemas)}
                </Descriptions.Item>
              )}
              {data?.type === 'show' && data?.firstAired && (
                <Descriptions.Item label="First Aired">
                  {formatDate(data.firstAired)}
                </Descriptions.Item>
              )}
              {data?.added && (
                <Descriptions.Item label="Added to Plex">
                  {formatDate(data.added)}
                </Descriptions.Item>
              )}
              {data?.imdbId && (
                <Descriptions.Item label="IMDb">
                  <a
                    href={`https://www.imdb.com/title/${data.imdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#e5a00d' }}
                  >
                    {data.imdbId} <LinkOutlined style={{ fontSize: 11 }} />
                  </a>
                </Descriptions.Item>
              )}
              {data?.tmdbId && (
                <Descriptions.Item label="TMDB">
                  <a
                    href={`https://www.themoviedb.org/movie/${data.tmdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#e5a00d' }}
                  >
                    {data.tmdbId} <LinkOutlined style={{ fontSize: 11 }} />
                  </a>
                </Descriptions.Item>
              )}
              {data?.tvdbId && (
                <Descriptions.Item label="TVDB">
                  <a
                    href={`https://thetvdb.com/?id=${data.tvdbId}&tab=series`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#e5a00d' }}
                  >
                    {data.tvdbId} <LinkOutlined style={{ fontSize: 11 }} />
                  </a>
                </Descriptions.Item>
              )}
              {data?.collection && (
                <Descriptions.Item label="Collection">{data.collection}</Descriptions.Item>
              )}
            </Descriptions>
          </div>
        </div>
      )}
    </Drawer>
  );
}
