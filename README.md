# Meow Bakery 3D

구름 위 빵집에서 30초 동안 하늘에서 떨어지는 베이킹 재료를 바구니에 받는 3D 게임입니다.
똥을 받으면 이번 판에 모은 재료가 모두 사라집니다.

- 조작: 마우스·터치로 바구니 이동 / 방향키 ← → (또는 A, D)
- 3D: [Three.js](https://threejs.org/) 0.187.0
- 움직임·효과: [GSAP](https://gsap.com/) 3.15.1
- 빌드 없이 `index.html`과 `src/main.js`만으로 동작합니다. 라이브러리 파일은 `vendor/`에 들어 있습니다.

## 파일
- `index.html`, `style.css`, `src/main.js`: 게임 본체
- `vendor/`: Three.js(MIT, `THREE-LICENSE.txt` 참고), GSAP(GSAP 표준 라이선스: https://gsap.com/standard-license)
- `assets/cats/`: 고양이 그림(기존 Meow Bakery 프로젝트에서 가져옴. 그림 출처 표기는 원 프로젝트에서 확인 필요)

## 로컬에서 열기
저장소 폴더에서 `python3 -m http.server`를 실행하고 http://localhost:8000 을 엽니다.
(파일을 더블클릭하면 브라우저가 모듈 불러오기를 막아서 작동하지 않습니다.)
