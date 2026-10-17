export interface ExifMetadata {
  make?: string;             // 제조사 (Sony, Canon, Nikon, Leica, Apple, etc.)
  model?: string;            // 모델명 (ILCE-7M4, EOS R5, etc.)
  lensModel?: string;        // 렌즈 (FE 35mm F1.4 GM, etc.)
  focalLength?: string;      // 초점거리 (35mm)
  focalLength35mm?: string;  // 35mm 환산 초점거리
  fNumber?: string;          // 조리개 (f/1.4)
  exposureTime?: string;     // 셔터스피드 (1/500s)
  iso?: string;              // ISO (100)
  dateTime?: string;         // 촬영 일시 (2024.10.17 14:30)
  artist?: string;           // 촬영자
  copyright?: string;        // 저작권
}

export type ThemeType = 
  | 'ONE_LINE'           // 하단 단일 라인 스펙
  | 'TWO_LINE'           // 상단 카메라/렌즈, 하단 촬영값
  | 'SHOT_ON_LOGO'       // 좌측 브랜드 로고 + Shot on 모델명, 우측 스펙
  | 'POLAROID_STRAP'     // 폴라로이드 스타일 넓은 하단 여백
  | 'MINIMAL_BORDER'     // 깔끔한 얇은 프레임 + 모서리 텍스트
  | 'FILM_FRAME'         // 35mm 필름 네거티브 펀치홀 스타일
  | 'CINEMASCOPE'        // 2.39:1 시네마틱 레터박스 자막 스타일
  | 'JUST_FRAME';        // 텍스트 없는 순수 갤러리 액자

export interface FramePadding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface RenderOptions {
  theme: ThemeType;
  padding: FramePadding;
  backgroundColor: string;   // 배경색 (기본: #ffffff)
  textColor: string;         // 텍스트 색 (기본: #111111)
  subTextColor: string;      // 보조 텍스트 색 (기본: #666666)
  fontFamily: string;        // 폰트 패밀리
  showLogo: boolean;         // 카메라 제조사 로고 표시 여부
  fontSizeScale?: number;    // 폰트 크기 배율 (0.8 = S, 1.0 = M, 1.2 = L, 1.4 = XL)
  customText?: string;       // 사용자 커스텀 문구 (워터마크 등)
  targetScale?: number;      // 출력 배율 (1 = 원본 크기, 0.5 = 절반 등)
}
