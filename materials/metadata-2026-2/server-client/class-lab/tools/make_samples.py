"""아카이빙 실습 보기 파일을 만듭니다(모두 이 스크립트가 그린 그림과 컴퓨터 음성이라 저작권 걱정이 없음).
실행: python tools/make_samples.py   (class-lab 폴더에서, Windows: 음성은 PowerShell의 Microsoft Heami)
만드는 것: samples/ 아래
  library-shelf.jpg            서가 그림 + EXIF(카메라, 촬영 때, 전남대 도서관 근처 GPS)  -> 위치 정보 문제
  reading-room.png             열람실 그림 (PNG, EXIF 없음)
  cover-scan.jpg               속은 PNG인데 이름만 .jpg                                    -> 형식 불일치
  broken-photo.jpg             앞부분만 남은 JPEG                                          -> 깨진 파일
  우리 도서관 사진 (최종) 진짜최종.JPG  한글, 띄어쓰기, 괄호, 대문자 확장자                 -> 이름 문제
  book-talk.wav                컴퓨터 음성 안내 (44.1kHz, 16비트, 모노)
  (library-tour.mp4 는 서버 설치 때 ffmpeg가 위 그림과 녹음으로 만듭니다: setup/make-video.sh)
"""
import random, subprocess, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'samples'
OUT.mkdir(exist_ok=True)
random.seed(2026)

def shelf(w, h):
    im = Image.new('RGB', (w, h), (236, 228, 214))
    d = ImageDraw.Draw(im)
    for y in range(h):  # 위에서 아래로 밝기가 바뀌는 벽
        c = int(242 - 30 * y / h); d.line([(0, y), (w, y)], fill=(c, c - 8, c - 22))
    rows = 4; top = int(h * .08); rh = int(h * .2)
    for r in range(rows):
        y0 = top + r * rh; y1 = y0 + rh - int(h * .025)
        d.rectangle([int(w * .05), y1, int(w * .95), y1 + int(h * .025)], fill=(120, 84, 52))
        x = int(w * .06)
        while x < w * .93:
            bw = random.randint(int(w * .012), int(w * .03)); bh = random.randint(int(rh * .62), int(rh * .92))
            col = random.choice([(31, 58, 95), (168, 116, 47), (47, 107, 63), (150, 52, 52), (90, 90, 120), (210, 190, 150), (60, 60, 60)])
            col = tuple(max(0, min(255, c + random.randint(-18, 18))) for c in col)
            d.rectangle([x, y1 - bh, x + bw, y1], fill=col, outline=(30, 30, 30))
            d.line([x + 3, y1 - bh + 12, x + bw - 3, y1 - bh + 12], fill=(240, 230, 200), width=2)
            x += bw + random.randint(1, 4)
    return im.filter(ImageFilter.GaussianBlur(0.6))

def room(w, h):
    im = Image.new('RGB', (w, h), (225, 232, 240)); d = ImageDraw.Draw(im)
    d.rectangle([0, int(h * .62), w, h], fill=(176, 150, 118))
    for i in range(5):
        x = int(w * (.08 + i * .18)); d.rectangle([x, int(h * .1), x + int(w * .12), int(h * .45)], fill=(245, 248, 252), outline=(120, 140, 160), width=4)
    for i in range(3):
        y = int(h * (.62 + i * .11)); d.rectangle([int(w * .1), y, int(w * .9), y + int(h * .03)], fill=(140, 98, 62))
        for j in range(6):
            cx = int(w * (.16 + j * .135)); d.ellipse([cx - 18, y - 40, cx + 18, y - 4], fill=(70, 90, 120))
    return im

def deg(v):  # 소수 각도 -> EXIF 도, 분, 초
    from PIL.TiffImagePlugin import IFDRational
    d = int(v); m = int((v - d) * 60); s = round(((v - d) * 60 - m) * 60 * 100)
    return (IFDRational(d, 1), IFDRational(m, 1), IFDRational(s, 100))

def exif_for(when):
    from PIL import ExifTags
    ex = Image.Exif()
    ex[0x010F] = 'ClassLab'; ex[0x0110] = 'Practice Camera 1'; ex[0x0131] = 'make_samples.py'; ex[0x0112] = 1
    ex[0x0132] = when
    ifd = ex.get_ifd(0x8769); ifd[0x9003] = when; ifd[0x9004] = when
    gps = ex.get_ifd(0x8825)
    gps[1] = 'N'; gps[2] = deg(35.17616); gps[3] = 'E'; gps[4] = deg(126.90513)
    return ex

def main():
    a = shelf(2400, 1600)
    a.save(OUT / 'library-shelf.jpg', quality=88, exif=exif_for('2026:11:20 14:30:12'))
    b = room(1600, 1000); b.save(OUT / 'reading-room.png')
    c = shelf(1200, 1600); c.save(OUT / 'cover-scan.jpg', format='PNG')        # 이름만 .jpg
    full = OUT / 'library-shelf.jpg'
    data = full.read_bytes(); (OUT / 'broken-photo.jpg').write_bytes(data[: int(len(data) * .35)])
    shelf(1800, 1200).save(OUT / '우리 도서관 사진 (최종) 진짜최종.JPG', quality=85, exif=exif_for('2026:11:21 09:05:40'))
    text = ('안녕하세요. 메타데이터와 아카이빙 연구 수업의 실습용 녹음입니다. '
            '이 녹음은 2026년 11월에 컴퓨터 음성으로 만들었습니다. '
            '아카이브에 넣을 때에는 제목, 만든이, 날짜, 권리를 꼭 적어 주세요. '
            '표본 추출률과 채널 수 같은 기술 메타데이터는 서버가 파일에서 읽어 냅니다.')
    wav = OUT / 'book-talk.wav'
    ps = ("Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
          "$s.SelectVoice('Microsoft Heami Desktop'); $s.Rate = 0; "
          "$f = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(44100, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono); "
          f"$s.SetOutputToWaveFile('{wav}', $f); $s.Speak([IO.File]::ReadAllText('{OUT / '_tts.txt'}')); $s.Dispose()")
    (OUT / '_tts.txt').write_text(text, encoding='utf-8-sig')
    subprocess.run(['powershell', '-NoProfile', '-Command', ps], check=True)
    (OUT / '_tts.txt').unlink()
    for f in sorted(OUT.iterdir()): print(f.name, f.stat().st_size)

if __name__ == '__main__':
    main()
