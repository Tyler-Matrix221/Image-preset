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
];

export function getPoseById(id: string): PoseTemplate {
  return POSE_TEMPLATES.find((p) => p.id === id) || POSE_TEMPLATES[0];
}
