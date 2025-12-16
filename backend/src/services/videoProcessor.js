const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class VideoProcessor {
  constructor() {
    this.qualities = [
      { name: '1080p', height: 1080, bitrate: '5000k' },
      { name: '720p', height: 720, bitrate: '2500k' },
      { name: '480p', height: 480, bitrate: '1000k' },
      { name: '360p', height: 360, bitrate: '500k' }
    ];
  }

  async getMetadata(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        resolve({
          duration: Math.floor(metadata.format.duration || 0),
          fileSize: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          format: metadata.format.format_name,
          video: videoStream ? {
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height,
            fps: eval(videoStream.r_frame_rate) || 30,
            bitrate: videoStream.bit_rate
          } : null,
          audio: audioStream ? {
            codec: audioStream.codec_name,
            channels: audioStream.channels,
            sampleRate: audioStream.sample_rate
          } : null
        });
      });
    });
  }

  async generateThumbnail(videoPath, outputDir, timestamp = '00:00:05') {
    const thumbnailName = `${uuidv4()}.jpg`;
    const thumbnailPath = path.join(outputDir, thumbnailName);
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: thumbnailName,
          folder: outputDir,
          size: '1280x720'
        })
        .on('end', () => resolve(thumbnailPath))
        .on('error', reject);
    });
  }

  async transcodeToQualities(videoPath, outputDir, videoId, onProgress) {
    const metadata = await this.getMetadata(videoPath);
    const sourceHeight = metadata.video?.height || 1080;
    const results = [];
    const applicableQualities = this.qualities.filter(q => q.height <= sourceHeight);

    for (const quality of applicableQualities) {
      const outputName = `${videoId}_${quality.name}.mp4`;
      const outputPath = path.join(outputDir, outputName);

      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .outputOptions([
            `-vf scale=-2:${quality.height}`,
            `-b:v ${quality.bitrate}`,
            '-c:v libx264',
            '-preset medium',
            '-c:a aac',
            '-b:a 128k',
            '-movflags +faststart'
          ])
          .output(outputPath)
          .on('progress', (progress) => {
            if (onProgress) onProgress(quality.name, progress.percent || 0);
          })
          .on('end', () => {
            results.push({ quality: quality.name, path: outputPath, height: quality.height });
            resolve();
          })
          .on('error', reject)
          .run();
      });
    }
    return results;
  }

  async generateHLS(videoPath, outputDir, videoId) {
    const hlsDir = path.join(outputDir, 'hls', videoId);
    await fs.mkdir(hlsDir, { recursive: true });

    const qualities = [
      { name: '1080p', height: 1080, bitrate: '5000k', bandwidth: 5000000 },
      { name: '720p', height: 720, bitrate: '2500k', bandwidth: 2500000 },
      { name: '480p', height: 480, bitrate: '1000k', bandwidth: 1000000 },
      { name: '360p', height: 360, bitrate: '500k', bandwidth: 500000 }
    ];

    const masterPlaylist = ['#EXTM3U', '#EXT-X-VERSION:3'];

    for (const quality of qualities) {
      const qualityDir = path.join(hlsDir, quality.name);
      await fs.mkdir(qualityDir, { recursive: true });

      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .outputOptions([
            `-vf scale=-2:${quality.height}`,
            `-b:v ${quality.bitrate}`,
            '-c:v libx264',
            '-preset fast',
            '-c:a aac',
            '-b:a 128k',
            '-hls_time 10',
            '-hls_list_size 0',
            '-hls_segment_filename', path.join(qualityDir, 'segment_%03d.ts'),
            '-f hls'
          ])
          .output(path.join(qualityDir, 'playlist.m3u8'))
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      masterPlaylist.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${quality.bandwidth},RESOLUTION=${Math.floor(quality.height * 16 / 9)}x${quality.height}`,
        `${quality.name}/playlist.m3u8`
      );
    }

    const masterPath = path.join(hlsDir, 'master.m3u8');
    await fs.writeFile(masterPath, masterPlaylist.join('\n'));
    return { masterPlaylist: masterPath, hlsDir };
  }

  async generateContentFingerprint(videoPath) {
    const hash = crypto.createHash('sha256');
    const fileBuffer = await fs.readFile(videoPath);
    hash.update(fileBuffer.slice(0, 1024 * 1024));
    return hash.digest('hex');
  }
}

module.exports = new VideoProcessor();
