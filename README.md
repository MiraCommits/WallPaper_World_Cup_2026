# World Cup 2026 Live Wallpaper - GitHub Actions mode

Ban nay tranh loi CORS cua football-data.org bang cach:

1. GitHub Actions goi football-data.org bang secret `FOOTBALL_DATA_TOKEN`.
2. Action ghi du lieu moi vao `data.json` va `data.js`.
3. GitHub Pages/Lively chi doc file tinh `data.json`, khong goi thang API tu browser.

## Cau truc

```text
.github/workflows/update-football-data.yml
scripts/update-data.js
index.html
app.js
config.js
data.json
data.js
styles.css
assets/stadium-bg.png
```

Neu folder cua ban da co `assets/stadium-bg.png`, hay giu nguyen file do.

## Cach day len GitHub

```bash
git init
git add .
git commit -m "Initial World Cup wallpaper"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

## Them API token vao GitHub Secret

Vao repository tren GitHub:

Settings -> Secrets and variables -> Actions -> New repository secret

Name:

```text
FOOTBALL_DATA_TOKEN
```

Value: token football-data.org cua ban.

## Bat GitHub Pages

Repository Settings -> Pages -> Build and deployment

- Source: Deploy from a branch
- Branch: main
- Folder: /root

URL se co dang:

```text
https://USERNAME.github.io/REPO/
```

## Chay Action lan dau

Vao tab Actions -> Update football-data.org data -> Run workflow.

Sau khi workflow xanh, mo `data.json` tren repo de xem da duoc cap nhat chua.

## Them vao Lively

Dung URL GitHub Pages:

```text
https://USERNAME.github.io/REPO/
```

Khong dung `localhost:5500`, khong dung Live Server. Lively se doc `data.json` moi moi 5 phut theo `REFRESH_INTERVAL` trong `config.js`.
