import os
import shutil
import logging
import subprocess
from typing import Dict, Any, List, Optional
from PIL import Image, ImageDraw, ImageFont
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from ..config import settings
from .tts import TTSService

logger = logging.getLogger("sahayak.video")

class VideoService:
    @classmethod
    def _format_srt_timestamp(cls, seconds: float) -> str:
        """Converts float seconds to SRT time format: HH:MM:SS,mmm"""
        hrs = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int(round((seconds - int(seconds)) * 1000))
        return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

    @classmethod
    def _create_slide_image(
        cls, 
        output_image_path: str, 
        concept: str, 
        visual_spec: Dict[str, Any], 
        script: str, 
        anchor_image_path: Optional[str] = None
    ) -> None:
        """
        Renders a rich 1280x720 slide PNG using Pillow and matplotlib.
        """
        width, height = 1280, 720
        # Dark modern slate gradient background
        img = Image.new("RGBA", (width, height), (15, 23, 42, 255))
        draw = ImageDraw.Draw(img)

        # Header bar
        draw.rectangle([(0, 0), (width, 80)], fill=(30, 41, 59, 255))
        draw.line([(0, 80), (width, 80)], fill=(99, 102, 241, 255), width=3)

        # Draw logo/title text
        draw.text((40, 24), "Sahayak AI Teacher", fill=(129, 140, 248, 255))
        draw.text((320, 26), f"•  {concept[:55]}", fill=(241, 245, 249, 255))

        # Main content card area
        draw.rounded_rectangle([(40, 110), (1240, 660)], radius=16, fill=(30, 41, 59, 200), outline=(51, 65, 85, 255), width=2)

        # Render Visual Spec inside content card
        v_type = (visual_spec.get("type") or "labeled-diagram").lower()
        title = visual_spec.get("title") or concept

        draw.text((70, 130), f"Topic: {title}", fill=(56, 189, 248, 255))

        # Sub-content rendering via Matplotlib plot or rich layout
        plot_saved = False
        temp_plot_path = output_image_path + "_plot.png"

        try:
            fig, ax = plt.subplots(figsize=(6.5, 3.8), dpi=100, facecolor="#0f172a")
            ax.set_facecolor("#1e293b")
            
            if "equation" in v_type or "math" in v_type or "physics" in v_type:
                import numpy as np
                x = np.linspace(-3, 3, 100)
                y = np.sin(x) * np.exp(-0.2 * x**2)
                ax.plot(x, y, color="#38bdf8", linewidth=2.5, label="f(x) Dynamic")
                ax.grid(True, linestyle="--", alpha=0.3, color="#64748b")
                ax.set_title(concept, color="#f8fafc", fontsize=12, pad=10)
                ax.tick_params(colors="#94a3b8")
                for spine in ax.spines.values():
                    spine.set_color("#475569")
                ax.legend(facecolor="#0f172a", edgecolor="#38bdf8", labelcolor="#f8fafc")
            elif "timeline" in v_type or "map" in v_type:
                stages = ["Origins", "Discovery", "Mechanics", "Synthesis"]
                y_pos = [1, 2, 3, 4]
                ax.barh(stages, [2, 4, 6, 8], color=["#818cf8", "#38bdf8", "#34d399", "#f472b6"])
                ax.set_title(f"Timeline Progression: {concept}", color="#f8fafc", fontsize=12)
                ax.tick_params(colors="#94a3b8")
                for spine in ax.spines.values():
                    spine.set_color("#475569")
            else:
                # Default bar/concept chart
                categories = ["Principle", "Observation", "Verification", "Mastery"]
                values = [85, 92, 78, 95]
                bars = ax.bar(categories, values, color=["#6366f1", "#06b6d4", "#10b981", "#f59e0b"])
                ax.set_ylim(0, 110)
                ax.set_title(f"Pedagogical Blueprint: {concept}", color="#f8fafc", fontsize=12)
                ax.tick_params(colors="#94a3b8")
                for spine in ax.spines.values():
                    spine.set_color("#475569")

            fig.tight_layout()
            fig.savefig(temp_plot_path, facecolor=fig.get_facecolor(), edgecolor="none")
            plt.close(fig)
            plot_saved = True
        except Exception as plot_err:
            logger.warning(f"[VideoService] Matplotlib chart render failed: {plot_err}")
            plt.close("all")

        if plot_saved and os.path.exists(temp_plot_path):
            try:
                plot_img = Image.open(temp_plot_path).convert("RGBA")
                img.paste(plot_img, (70, 180), plot_img)
            except Exception as e:
                logger.warning(f"[VideoService] Failed to paste plot image: {e}")
            finally:
                if os.path.exists(temp_plot_path):
                    os.remove(temp_plot_path)

        # Right side notes / key bullet points
        notes_x = 750
        draw.text((notes_x, 180), "Core Highlights:", fill=(251, 191, 36, 255))
        
        words = script.split()
        lines = []
        curr = []
        for w in words[:60]:
            curr.append(w)
            if len(" ".join(curr)) > 32:
                lines.append(" ".join(curr))
                curr = []
        if curr:
            lines.append(" ".join(curr))

        for idx, line in enumerate(lines[:8]):
            draw.text((notes_x, 220 + (idx * 26)), f"• {line}", fill=(226, 232, 240, 255))

        # Presenter Corner Avatar (if anchor portrait provided)
        if anchor_image_path and os.path.exists(anchor_image_path):
            try:
                presenter = Image.open(anchor_image_path).convert("RGBA")
                presenter = presenter.resize((140, 140), Image.Resampling.LANCZOS)
                
                # Create rounded circle mask
                mask = Image.new("L", (140, 140), 0)
                mask_draw = ImageDraw.Draw(mask)
                mask_draw.ellipse((0, 0, 140, 140), fill=255)
                
                # Paste presenter into bottom right corner of the slide
                img.paste(presenter, (width - 190, height - 190), mask)
                draw.ellipse([(width - 190, height - 190), (width - 50, height - 50)], outline=(99, 102, 241, 255), width=3)
            except Exception as e:
                logger.warning(f"[VideoService] Failed to composite presenter portrait: {e}")

        # Save final slide PNG
        img.convert("RGB").save(output_image_path, "PNG")

    @classmethod
    async def render_segment_video(
        cls,
        *,
        segment_id: int,
        session_id: str,
        script: str,
        audio_url: Optional[str] = None,
        visual_spec: Optional[Dict[str, Any]] = None,
        captions: Optional[List[Any]] = None,
        anchor_image_path: Optional[str] = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Renders a genuine H.264 MP4 video with burned-in subtitles and synced TTS audio.
        Degrades gracefully if ffmpeg or audio is unavailable.
        """
        # 1. Check ffmpeg availability
        ffmpeg_bin = shutil.which("ffmpeg")
        if not ffmpeg_bin:
            logger.warning("[VideoService] ffmpeg binary not found on PATH; local video generation unavailable.")
            return {
                "provider": "ffmpeg_local",
                "status": "unavailable",
                "video_url": None,
                "duration_sec": 0.0
            }

        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        media_dir = os.path.join(backend_dir, settings.MEDIA_DIR)
        os.makedirs(media_dir, exist_ok=True)

        # 2. Resolve Audio Track
        audio_path = None
        duration_sec = 8.0

        if audio_url and audio_url.startswith("/media/"):
            audio_filename = os.path.basename(audio_url)
            possible_path = os.path.join(media_dir, audio_filename)
            if os.path.exists(possible_path) and os.path.getsize(possible_path) > 0:
                audio_path = possible_path

        if not audio_path:
            # Attempt real-time TTS audio generation
            try:
                tts_res = await TTSService.generate_speech(script, language=language)
                if tts_res.get("audio_url") and tts_res["audio_url"].startswith("/media/"):
                    audio_filename = os.path.basename(tts_res["audio_url"])
                    possible_path = os.path.join(media_dir, audio_filename)
                    if os.path.exists(possible_path) and os.path.getsize(possible_path) > 0:
                        audio_path = possible_path
                        duration_sec = tts_res.get("duration_seconds") or 8.0
            except Exception as e:
                logger.warning(f"[VideoService] Audio generation for video failed: {e}")

        if not audio_path or not os.path.exists(audio_path):
            logger.warning("[VideoService] No audio track available; skipping video synthesis.")
            return {
                "provider": "ffmpeg_local",
                "status": "unavailable",
                "video_url": None,
                "duration_sec": 0.0
            }

        # 3. Create Slide PNG
        slide_filename = f"{session_id}_{segment_id}_slide.png"
        slide_path = os.path.join(media_dir, slide_filename)
        concept = (visual_spec or {}).get("title") or f"Segment {segment_id}"

        try:
            cls._create_slide_image(
                output_image_path=slide_path,
                concept=concept,
                visual_spec=visual_spec or {},
                script=script,
                anchor_image_path=anchor_image_path
            )
        except Exception as e:
            logger.error(f"[VideoService] Slide PNG generation error: {e}")
            return {
                "provider": "ffmpeg_local",
                "status": "unavailable",
                "video_url": None,
                "duration_sec": 0.0
            }

        # 4. Build SRT Subtitles
        srt_filename = f"{session_id}_{segment_id}.srt"
        srt_path = os.path.join(media_dir, srt_filename)

        try:
            srt_entries = []
            if captions and len(captions) > 0:
                for idx, c in enumerate(captions):
                    start_s = getattr(c, "start_sec", None) if hasattr(c, "start_sec") else (c.get("start_sec") if isinstance(c, dict) else None)
                    end_s = getattr(c, "end_sec", None) if hasattr(c, "end_sec") else (c.get("end_sec") if isinstance(c, dict) else None)
                    text = getattr(c, "text", "") if hasattr(c, "text") else (c.get("text", "") if isinstance(c, dict) else str(c))
                    
                    if start_s is None or end_s is None:
                        start_s = (idx / len(captions)) * duration_sec
                        end_s = ((idx + 1) / len(captions)) * duration_sec

                    srt_entries.append(
                        f"{idx+1}\n{cls._format_srt_timestamp(start_s)} --> {cls._format_srt_timestamp(end_s)}\n{text.strip()}\n"
                    )
            else:
                srt_entries.append(
                    f"1\n{cls._format_srt_timestamp(0.0)} --> {cls._format_srt_timestamp(duration_sec)}\n{script[:100]}\n"
                )

            with open(srt_path, "w", encoding="utf-8") as f:
                f.write("\n".join(srt_entries))
        except Exception as e:
            logger.warning(f"[VideoService] SRT build error ({e}); proceeding without subtitles.")
            srt_path = None

        # 5. Run ffmpeg Subprocess
        out_video_filename = f"{session_id}_{segment_id}.mp4"
        out_video_path = os.path.join(media_dir, out_video_filename)

        # ffmpeg command: loop slide PNG + audio -> MP4
        cmd = [
            ffmpeg_bin,
            "-y",
            "-loop", "1",
            "-i", slide_path,
            "-i", audio_path,
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-shortest"
        ]

        # If subtitles file exists, burn into video
        if srt_path and os.path.exists(srt_path):
            escaped_srt = srt_path.replace(":", "\\:").replace("\\", "/")
            cmd.extend(["-vf", f"subtitles='{escaped_srt}':force_style='FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3'"])

        cmd.append(out_video_path)

        try:
            logger.info(f"[VideoService] Executing ffmpeg video synthesis for {out_video_filename}...")
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
            if result.returncode == 0 and os.path.exists(out_video_path) and os.path.getsize(out_video_path) > 1024:
                logger.info(f"[VideoService] Successfully rendered video: {out_video_filename}")
                return {
                    "provider": "ffmpeg_local",
                    "status": "ready",
                    "video_url": f"/media/{out_video_filename}",
                    "duration_sec": duration_sec
                }
            else:
                logger.warning(f"[VideoService] ffmpeg failed with code {result.returncode}: {result.stderr.decode('utf-8', errors='ignore')[:300]}")
        except subprocess.TimeoutExpired:
            logger.error("[VideoService] ffmpeg render timed out (120s limit).")
        except Exception as e:
            logger.error(f"[VideoService] ffmpeg execution error: {e}")

        return {
            "provider": "ffmpeg_local",
            "status": "unavailable",
            "video_url": None,
            "duration_sec": 0.0
        }
