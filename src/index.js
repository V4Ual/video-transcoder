const express = require('express')
const path = require('path')
const app = express()
const multer = require("multer");
const upload = multer();
const fs = require("fs");
const {db}  =require('./models')

app.use(express.json())
app.use(express.urlencoded({extended:'true'}))

app.use("/public",express.static(path.join(__dirname,'../public')))


const userOnline = new Map()
app.post("/video-upload", upload.single("video"), (req, res) => {

    const {socketId} = req.body
    const data = userOnline.get(socketId)
  
    
    if(data?.process > 1){
      return  res.send('one time only one')
    }

    const file = req.file;
    
    const dirName = Date.now();
    fs.mkdir(path.join(__dirname, `../public/${dirName}`), (err) => {
      if (err) {
        return console.error(err);
      }
    });
  
    const fileName = `${"id" + Math.random().toString(16).slice(2)}.mp4` 
    const filePath = path.join(
      __dirname,
      `../public/${dirName}/${fileName}`
    );
    const writeStream = fs.createWriteStream(filePath);
    writeStream.write(file.buffer);
    writeStream.end();
    // console.log(file.originalname);
    res.redirect(
      `${process.env.BASE_URL}?video=${fileName}&dirName=${dirName}&socketId=${socketId}`
    );
  });

  app.get("/", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader('Connection','keep-alive')
    const { video, dirName,socketId } = req.query;
  
    const inProgress = userOnline.get(socketId)
  
    const newProgress = inProgress?.progress + 1 
  
    userOnline.set(socketId,newProgress)
    console.log({ video, dirName });
  
    const { exec } = require("child_process");
    const path = require("path");
    const fs = require("fs");
    const playlistContent = `
    #EXTM3U
    #EXT-X-VERSION:4
    #EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
    360p.m3u8
    #EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=842x480
    480p.m3u8
    #EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
    720p.m3u8
    #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
    1080p.m3u8
    `;
    console.log(path.join(__dirname, `../public/${dirName}/playlist.m3u8`));
    const path2 = path.join(__dirname, `../public/${dirName}/playlist.m3u8`);
    fs.writeFile(path2, playlistContent, (err) => {
      if (err) {
        console.error(`Error writing playlist file: ${err.message}`);
        return;
      }
      console.log("Playlist file (playlist.m3u8) created successfully.");
    });
    // // Define the FFmpeg command for creating the DASH-compliant video file
  const dashCommand = `ffmpeg -hide_banner -y -i ${path.join(
    __dirname,
    `../public/${dirName}/${video}`
  )} \
  -progress pipe:1 \
  -vf "scale=w=640:h=360:force_original_aspect_ratio=decrease" -c:a aac -ar 48000 -c:v h264 -profile:v main -crf 20 -sc_threshold 0 -g 48 -keyint_min 48 \
  -hls_time 12 -hls_playlist_type vod -b:v 800k -maxrate 856k -bufsize 1200k -b:a 96k \
  -hls_segment_filename public/${dirName}/360p_%03d.ts public/${dirName}/360p.m3u8 \
  -vf "scale=w=842:h=480:force_original_aspect_ratio=decrease" -c:a aac -ar 48000 -c:v h264 -profile:v main -crf 20 -sc_threshold 0 -g 48 -keyint_min 48 \
  -hls_time 12 -hls_playlist_type vod -b:v 1400k -maxrate 1498k -bufsize 2100k -b:a 128k \
  -hls_segment_filename public/${dirName}/480p_%03d.ts public/${dirName}/480p.m3u8 \
  -vf "scale=w=1280:h=720:force_original_aspect_ratio=decrease" -c:a aac -ar 48000 -c:v h264 -profile:v main -crf 20 -sc_threshold 0 -g 48 -keyint_min 48 \
  -hls_time 12 -hls_playlist_type vod -b:v 2800k -maxrate 2996k -bufsize 4200k -b:a 128k \
  -hls_segment_filename public/${dirName}/720p_%03d.ts public/${dirName}/720p.m3u8 \
  -vf "scale=w=1920:h=1080:force_original_aspect_ratio=decrease" -c:a aac -ar 48000 -c:v h264 -profile:v main -crf 20 -sc_threshold 0 -g 48 -keyint_min 48 \
  -hls_time 12 -hls_playlist_type vod -b:v 5000k -maxrate 5350k -bufsize 7500k -b:a 192k \
  -hls_segment_filename public/${dirName}/1080p_%03d.ts public/${dirName}/1080p.m3u8 \
  -vf "scale=w=1920:h=1080:force_original_aspect_ratio=decrease,thumbnail" \
  -frames:v 1 public/${dirName}/thumbnail.jpg`;
    // Execute the FFmpeg command for creating HLS segments
    const data = exec(dashCommand, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return false;
      }
      if (stderr) {
        console.error(`FFmpeg stderr: ${stderr}`);
        return true;
      }
      // res.write("data: hello how are you\n\n"); // Send the message
      if (stdout) {
        return true;
      }
    });
  
    console.log({ data });
  
    if (data) {
      await db.Video.create({
        video: `${dirName}/playlist.m3u8`,
        thumbnail: `${dirName}/thumbnail.jpg`,
      });
      // res.end();
    }

    
  
    data.stderr.on("data", (data) => {
      const log = data.toString();
  
      // Extract total duration
      if (log.includes('Duration:')) {
        const durationMatch = log.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
        if (durationMatch) {
          const [, hours, minutes, seconds] = durationMatch;
          totalDuration = parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
        }
      }
    
      // Extract current processing time
      if (log.includes('time=')) {
        const timeMatch = log.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch) {
          const [, hours, minutes, seconds] = timeMatch;
          const currentTime = parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
    
          if (totalDuration > 0) {
            const progress = ((currentTime / totalDuration) * 100).toFixed(2);
            console.log(`Progress: ${progress}%`);
            res.write(`Progress: ${progress}%`)
            io.emit("Progress",progress)
            // Stream.on("push", function(event, data) {
            //   res.write("event: " + String(event) + "\n" + "data: " + JSON.stringify(data) + "\n\n");
            // });
          
          }
        }
      }// Send continuous updates
    });
    
    data.on("exit", (code, signal) => {
      console.log(`Process exited with code: ${code}, signal: ${signal}`);
      res.write("data: process done\n\n"); // Final message
      res.end(); // End the response
    });
    
    data.on("error", (err) => {
      console.error(`Process encountered an error: ${err.message}`);
      res.write(`data: Error encountered: ${err.message}\n\n`);
      res.end(); // Optionally end the response on error
    });
  
  
  });

const port  = process.env.PORT  || 3003

app.listen(port,()=>{
    console.log(`Server connection successfully ${port}`)
})