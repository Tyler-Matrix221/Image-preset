export interface PoseTemplate {
  id: string;
  name: string;
  category: string;
  /** Mô tả chính xác tư thế của hình vẽ SVG để AI viết câu hướng dẫn khớp 100% */
  visualDescription: string;
  defaultTip: string;
  /** Ảnh người thật minh họa (Unsplash) theo giới tính */
  samplePhotos?: {
    female?: string;
    male?: string;
    couple?: string;
  };
  /** Đường nét trắng vẽ trong viewBox 0 0 200 320 */
  paths: string[];
  head?: { cx: number; cy: number; r: number };
}

export const POSE_TEMPLATES: PoseTemplate[] = [
  {
    id: 'standing-casual',
    name: 'Đứng tự nhiên',
    category: 'Đứng',
    visualDescription:
      'Standing facing front; one hand (right hand, on viewer-left) tucked into pocket, the other arm relaxed at side, one knee slightly relaxed.',
    defaultTip:
      'Đứng thẳng thả lỏng vai, tay phải đút túi quần, tay trái buông tự nhiên và hơi chùng nhẹ một chân.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=480&q=80',
      couple: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 100, cy: 44, r: 16 },
    paths: [
      'M100,60 L100,72',
      'M74,76 Q100,70 126,76 L118,158 L82,158 Z',
      'M74,78 L60,118 L78,148',
      'M126,78 L136,124 L132,162',
      'M88,158 L84,224 L82,286',
      'M112,158 L118,224 L110,286',
    ],
  },
  {
    id: 'standing-side',
    name: 'Nghiêng 45° ngoái nhìn',
    category: 'Đứng',
    visualDescription:
      'Body angled 45 degrees sideways, head turned toward camera; near hand resting lightly on waist/hip, one leg stepped slightly forward.',
    defaultTip:
      'Xoay người nghiêng góc 45°, một tay chống nhẹ ngang hông, bước một chân lên trước và quay mặt nhìn ống kính.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 94, cy: 44, r: 16 },
    paths: [
      'M95,60 L96,72',
      'M80,76 L112,76 L108,156 L82,156 Z',
      'M80,78 L70,122',
      'M112,78 L128,112 L108,142',
      'M86,156 L78,224 L76,286',
      'M102,156 L114,222 L118,286',
    ],
  },
  {
    id: 'walking-candid',
    name: 'Bước đi tự nhiên',
    category: 'Chuyển động',
    visualDescription:
      'Mid-stride walking pose; one leg stepping forward and the other back, arms swinging gently in opposite directions, looking slightly aside.',
    defaultTip:
      'Bước chân dài tự nhiên như đang đi dạo, hai tay vung nhẹ ngược chiều nhau, ánh mắt nhìn lệch sang một bên.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 104, cy: 44, r: 16 },
    paths: [
      'M103,60 L102,72',
      'M82,76 L122,76 L116,156 L86,156 Z',
      'M82,78 L64,116 L54,148',
      'M122,78 L136,114 L144,140',
      'M90,156 L74,220 L58,282',
      'M112,156 L128,220 L142,282',
    ],
  },
  {
    id: 'hand-hair',
    name: 'Vuốt tóc / Che nắng',
    category: 'Chân dung',
    visualDescription:
      'Standing pose with one arm raised (model left arm, viewer-right), elbow bent outward and hand gently touching hair/temple; other arm relaxed down at side.',
    defaultTip:
      'Giơ tay trái lên chạm nhẹ tóc hoặc che nắng ngang trán, khuỷu tay mở nhẹ, tay phải buông thả lỏng.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 100, cy: 46, r: 16 },
    paths: [
      'M100,62 L100,74',
      'M76,76 Q100,70 124,76 L116,158 L84,158 Z',
      'M76,78 L66,124 L68,164',
      'M124,78 L148,92 L118,52',
      'M88,158 L84,224 L82,286',
      'M112,158 L118,224 L118,286',
    ],
  },
  {
    id: 'holding-prop',
    name: 'Cầm hoa / Phụ kiện',
    category: 'Đạo cụ',
    visualDescription:
      'Standing holding a prop (bouquet, coffee cup, or bag) at chest height with bent arm (model right arm, viewer-left); other arm hanging relaxed at side.',
    defaultTip:
      'Tay phải gập nhẹ nâng hoa/ly nước ngang ngực, tay trái thả lỏng tự nhiên, người hơi hướng về phía trước.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 100, cy: 44, r: 16 },
    paths: [
      'M100,60 L100,72',
      'M76,76 Q100,70 124,76 L118,158 L82,158 Z',
      'M76,78 L58,118 L74,102',
      'M62,84 C62,72 78,72 78,84 C78,94 70,100 70,100 C70,100 62,94 62,84 Z',
      'M124,78 L134,124 L132,162',
      'M88,158 L84,224 L82,286',
      'M112,158 L118,224 L118,286',
    ],
  },
  {
    id: 'half-body-lean',
    name: 'Tựa lan can / Tường',
    category: 'Bán thân',
    visualDescription:
      'Standing leaning casually against a horizontal railing at hip level; both forearms resting toward the railing, one ankle crossed.',
    defaultTip:
      'Tựa nhẹ hông và hai khuỷu tay lên lan can/bệ tường, hai chân bắt chéo nhẹ để tạo cảm giác thư giãn.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 96, cy: 48, r: 16 },
    paths: [
      'M96,64 L96,74',
      'M74,78 L120,78 L114,164 L80,164 Z',
      'M74,80 L56,126 L72,168',
      'M120,80 L136,128 L124,168',
      'M18,170 L182,170',
      'M86,164 L84,226 L84,284',
      'M110,164 L114,226 L96,282',
    ],
  },
  {
    id: 'cafe-sitting',
    name: 'Ngồi quán cafe',
    category: 'Ngồi',
    visualDescription:
      'Seated sideways at a cafe table on the left with a cup; leaning slightly forward with one arm resting on the table beside the cup, knees bent.',
    defaultTip:
      'Ngồi hơi nghiêng người về phía bàn cafe, tay phải đặt nhẹ lên mặt bàn cạnh ly nước, lưng giữ thẳng tự nhiên.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 116, cy: 62, r: 16 },
    paths: [
      'M116,78 L116,88',
      'M96,90 L138,90 L134,174 L98,174 Z',
      'M96,92 L78,134 L88,166',
      'M138,92 L144,138 L126,170',
      'M22,168 L98,168',
      'M42,154 L56,154 L54,168 L44,168 Z',
      'M100,174 L68,196 L68,268',
      'M128,174 L98,202 L98,272',
    ],
  },
  {
    id: 'looking-back',
    name: 'Quay lưng ngoái đầu',
    category: 'Nghệ thuật',
    visualDescription:
      'Back facing the camera, turning head back over the right shoulder toward the lens, both arms relaxed at sides.',
    defaultTip:
      'Quay lưng về phía máy ảnh, nhẹ nhàng ngoái đầu qua vai nhìn lại ống kính, hai tay buông tự nhiên.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 102, cy: 46, r: 16 },
    paths: [
      'M100,62 L100,72',
      'M74,76 Q100,84 126,76 L118,160 L82,160 Z',
      'M74,78 L64,126 L62,164',
      'M126,78 L138,124 L142,160',
      'M88,160 L82,226 L80,286',
      'M112,160 L122,226 L126,286',
    ],
  },
  {
    id: 'squat-street',
    name: 'Ngồi bậc thềm / Street',
    category: 'Ngồi',
    visualDescription:
      'Sitting low on steps/curb; right knee raised up with right elbow resting on knee, left foot resting lower on the step.',
    defaultTip:
      'Ngồi thấp trên bậc thềm, co cao đầu gối phải để tựa khuỷu tay lên, chân trái duỗi thấp tự nhiên.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 100, cy: 74, r: 16 },
    paths: [
      'M100,90 L100,102',
      'M78,104 L124,104 L118,184 L82,184 Z',
      'M78,106 L64,154 L76,188',
      'M124,106 L142,146 L128,164',
      'M86,184 L74,228 L88,268',
      'M114,184 L138,150 L146,230',
      'M26,232 L174,232',
    ],
  },
  {
    id: 'minimal-center',
    name: 'Đứng giữa cảnh rộng',
    category: 'Phong cảnh',
    visualDescription:
      'Small full-body figure standing centered in a wide landscape or architectural frame, arms relaxed slightly outward.',
    defaultTip:
      'Đứng nhỏ gọn ở chính giữa khung cảnh rộng, thả lỏng hai tay để làm nổi bật sự hùng vĩ của bối cảnh.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 100, cy: 82, r: 12 },
    paths: [
      'M100,94 L100,100',
      'M86,102 L114,102 L110,164 L90,164 Z',
      'M86,104 L74,142 L72,168',
      'M114,104 L126,142 L128,168',
      'M94,164 L92,216 L90,264',
      'M106,164 L108,216 L110,264',
    ],
  },
  {
    id: 'couple-standing',
    name: 'Cặp đôi đứng cạnh',
    category: '2 người',
    visualDescription:
      'Two people standing close side by side; taller person on the right with one arm gently around the shoulder/back of the person on the left.',
    defaultTip:
      'Hai người đứng sát vai nhau, người bên phải vòng tay nhẹ qua vai/lưng người bên trái, cùng nhìn ống kính hoặc nhìn nhau.',
    samplePhotos: {
      couple: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=480&q=80',
      female: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 76, cy: 54, r: 15 },
    paths: [
      'M76,69 L76,78',
      'M58,80 L94,80 L92,158 L60,158 Z',
      'M58,82 L50,126 L54,160',
      'M66,158 L64,222 L64,282',
      'M84,158 L88,222 L88,282',
      'M124,27 A15,15 0 1,0 124.1,27 Z',
      'M124,57 L124,66',
      'M106,68 L144,68 L140,158 L108,158 Z',
      'M106,70 L94,108',
      'M144,70 L154,122 L150,158',
      'M114,158 L112,222 L112,282',
      'M132,158 L136,222 L136,282',
    ],
  },
  {
    id: 'sofa-lounge-crossed',
    name: 'Ngồi sofa vắt chân',
    category: 'Ngồi',
    visualDescription:
      'Relaxed lounge sitting on a sofa or armchair; torso leaning slightly back into cushion, one arm resting along sofa back/armrest, legs crossed gracefully at the knee.',
    defaultTip:
      'Ngồi tựa lưng thư giãn lên ghế sofa, một tay đặt nhẹ lên tay vịn hoặc đùi, hai chân bắt chéo hướng chéo về góc ảnh để tạo dáng thon gọn.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 108, cy: 66, r: 16 },
    paths: [
      'M108,82 L106,94',
      'M84,96 Q106,90 128,98 L120,174 L86,174 Z',
      'M84,98 L62,126 L56,158',
      'M128,98 L144,136 L118,166',
      'M92,174 L68,202 L84,268',
      'M116,174 L78,196 L106,262',
    ],
  },
  {
    id: 'cafe-chin-rest',
    name: 'Chống cằm mơ màng',
    category: 'Ngồi',
    visualDescription:
      'Seated at a cafe table or counter, one elbow propped on the surface with hand lightly supporting the chin/cheek, soft head tilt toward camera.',
    defaultTip:
      'Tựa một khuỷu tay lên mặt bàn, bàn tay đỡ nhẹ cằm hoặc má, nghiêng đầu 15° nhìn mơ màng về phía ống kính.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 104, cy: 64, r: 16 },
    paths: [
      'M104,80 L102,92',
      'M80,94 L126,94 L122,174 L84,174 Z',
      'M80,96 L64,136 L94,80',
      'M126,96 L138,142 L116,172',
      'M34,174 L166,174',
      'M90,174 L78,224 L80,276',
      'M116,174 L112,224 L114,276',
    ],
  },
  {
    id: 'floor-recline',
    name: 'Ngồi duỗi chân nghệ thuật',
    category: 'Ngồi',
    visualDescription:
      'Sitting low on floor/rug/step leaning back onto one supporting hand behind, one knee bent upward and the other leg extended diagonally forward.',
    defaultTip:
      'Ngồi chống một tay ra sau làm điểm tựa, co nhẹ một đầu gối và duỗi thẳng chân còn lại theo đường chéo khung hình.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 74, cy: 102, r: 15 },
    paths: [
      'M78,116 L84,128',
      'M66,130 L102,136 L112,204 L76,204 Z',
      'M66,132 L42,174 L32,208',
      'M102,138 L124,168 L112,196',
      'M98,204 L126,162 L148,214',
      'M86,204 L142,216 L178,224',
    ],
  },
  {
    id: 'barstool-perch',
    name: 'Ngồi ghế cao / Quầy bar',
    category: 'Ngồi',
    visualDescription:
      'Perched on a high barstool or counter edge, torso angled slightly, one knee bent higher on footrest and the other leg extended downward.',
    defaultTip:
      'Ngồi tựa nhẹ mép ghế cao, một chân gác lên thanh để chân, chân kia duỗi thẳng xuống tạo đường nét kéo dài chân.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 100, cy: 52, r: 16 },
    paths: [
      'M100,68 L100,80',
      'M78,82 L122,82 L116,164 L84,164 Z',
      'M78,84 L62,126 L76,160',
      'M122,84 L138,124 L124,160',
      'M88,164 L68,208 L78,250',
      'M112,164 L118,224 L122,286',
    ],
  },
  {
    id: 'crossed-leg-stand',
    name: 'Đứng bắt chéo chân',
    category: 'Đứng',
    visualDescription:
      'Classic TikTok/FB full-body standing pose: weight on back leg, front leg crossed over on tiptoe to elongate silhouette, one hand on hip and other hand touching hair or bag.',
    defaultTip:
      'Dồn trọng tâm vào chân sau, chân trước bắt chéo kiễng nhẹ mũi chân, một tay chống hông và tay kia chạm nhẹ tóc hoặc quai túi.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 100, cy: 44, r: 16 },
    paths: [
      'M100,60 L100,72',
      'M76,76 Q100,70 124,76 L116,156 L84,156 Z',
      'M76,78 L58,112 L82,144',
      'M124,78 L144,98 L122,56',
      'M90,156 L92,222 L92,284',
      'M110,156 L84,220 L108,282',
    ],
  },
  {
    id: 'street-pocket-cool',
    name: 'Đút túi / Street cool',
    category: 'Đứng',
    visualDescription:
      'Confident street-style stance: weight shifted slightly to one hip, one hand tucked casually into pocket, other hand raised near collar, cap, or sunglasses.',
    defaultTip:
      'Thả lỏng vai, một tay đút túi quần tự nhiên, tay còn lại chạm nhẹ kính hoặc cổ áo, chân bước mở nhẹ sang bên.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 98, cy: 44, r: 16 },
    paths: [
      'M98,60 L98,72',
      'M74,76 L124,76 L118,158 L80,158 Z',
      'M74,78 L62,122 L80,154',
      'M124,78 L140,104 L112,62',
      'M86,158 L78,224 L74,286',
      'M112,158 L124,224 L132,286',
    ],
  },
  {
    id: 'wall-lean-chill',
    name: 'Tựa tường gác chân',
    category: 'Đứng',
    visualDescription:
      'Leaning one shoulder/back against a wall or doorframe, one leg straight supporting weight and the other knee bent with foot propped back against the wall.',
    defaultTip:
      'Tựa nhẹ một bên vai vào tường hoặc khung cửa, co một chân gác mũi giày ra sau, ánh mắt nhìn lệch tự nhiên.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 88, cy: 46, r: 16 },
    paths: [
      'M88,62 L90,74',
      'M70,76 L114,78 L112,160 L74,160 Z',
      'M70,78 L64,124 L76,156',
      'M114,80 L132,120 L108,148',
      'M84,160 L88,226 L90,286',
      'M108,160 L132,206 L96,240',
    ],
  },
  {
    id: 's-curve-portrait',
    name: 'Tạo dáng chữ S',
    category: 'Chân dung',
    visualDescription:
      'Flattering 3/4 S-curve portrait pose: hips pushed subtly aside, shoulders angled, one hand lightly touching collarbone/shoulder, chin slightly lowered.',
    defaultTip:
      'Đẩy nhẹ hông sang một bên tạo đường cong chữ S, xoay vai góc 45°, một tay chạm nhẹ xương quai xanh hoặc vai.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 104, cy: 44, r: 16 },
    paths: [
      'M104,60 L102,72',
      'M78,76 Q104,70 124,78 L112,158 L80,158 Z',
      'M78,78 L62,120 L78,154',
      'M124,78 L138,108 L108,84',
      'M86,158 L80,224 L82,286',
      'M108,158 L118,222 L114,286',
    ],
  },
  {
    id: 'sun-reach-candid',
    name: 'Vươn tay đón nắng',
    category: 'Chuyển động',
    visualDescription:
      'Dynamic candid TikTok/IG pose: turning torso slightly aside, raising one arm gracefully outward/upward toward light, soft arch in back and stepped leg.',
    defaultTip:
      'Xoay người đón ánh sáng, vươn nhẹ một tay lên cao hoặc sang ngang như đang đón nắng/gió, bước nhẹ một chân.',
    samplePhotos: {
      female: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 96, cy: 44, r: 16 },
    paths: [
      'M96,60 L98,72',
      'M76,76 L120,74 L114,156 L82,156 Z',
      'M76,78 L58,118 L54,154',
      'M120,74 L148,50 L166,30',
      'M88,156 L78,220 L70,282',
      'M110,156 L124,220 L132,282',
    ],
  },
  {
    id: 'couple-sitting',
    name: 'Cặp đôi ngồi tựa vai',
    category: '2 người',
    visualDescription:
      'Two people seated close together on a sofa or bench; one gently leaning head toward the other shoulder, hands resting near lap or intertwined.',
    defaultTip:
      'Hai người ngồi sát cạnh nhau trên sofa/ghế dài, một người nghiêng đầu tựa nhẹ lên vai người kia, tay đan hoặc đặt thoải mái.',
    samplePhotos: {
      couple: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=480&q=80',
      female: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=480&q=80',
      male: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=480&q=80',
    },
    head: { cx: 82, cy: 76, r: 15 },
    paths: [
      'M82,91 L82,100',
      'M62,102 L98,102 L96,174 L64,174 Z',
      'M62,104 L52,144 L66,170',
      'M70,174 L60,210 L62,272',
      'M90,174 L84,210 L86,272',
      'M122,52 A15,15 0 1,0 122.1,52 Z',
      'M122,82 L122,92',
      'M102,94 L142,94 L138,174 L104,174 Z',
      'M102,96 L90,136 L98,168',
      'M142,96 L150,142 L138,172',
      'M110,174 L112,212 L114,272',
      'M132,174 L136,212 L138,272',
    ],
  },
];

export function getPoseById(id: string): PoseTemplate {
  return POSE_TEMPLATES.find((p) => p.id === id) || POSE_TEMPLATES[0];
}
