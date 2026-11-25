export interface PoseTemplate {
  id: string;
  name: string;
  category: string;
  defaultTip: string;
  /** Đường nét trắng vẽ trong viewBox 0 0 200 320 */
  paths: string[];
  head?: { cx: number; cy: number; r: number };
}

export const POSE_TEMPLATES: PoseTemplate[] = [
  {
    id: 'standing-casual',
    name: 'Đứng tự nhiên',
    category: 'Đứng',
    defaultTip: 'Đứng thả lỏng vai, một tay đút túi quần hoặc chạm nhẹ vạt áo, chân trước hơi chùng.',
    head: { cx: 100, cy: 48, r: 18 },
    paths: [
      'M84,72 C74,76 68,86 64,115 L58,162 L72,164 L78,125 L82,175 L76,285 L92,285 L100,192 L112,285 L128,285 L118,175 L122,125 L132,158 L144,154 L134,108 C130,84 122,76 114,72 Z',
      'M84,72 Q100,82 114,72',
    ],
  },
  {
    id: 'standing-side',
    name: 'Nghiêng 45° ngoái nhìn',
    category: 'Đứng',
    defaultTip: 'Xoay người góc 45° so với ống kính, quay đầu nhìn về máy ảnh để góc mặt thon gọn hơn.',
    head: { cx: 92, cy: 46, r: 17 },
    paths: [
      'M84,68 C72,76 68,94 64,128 L54,168 L68,170 L78,136 L78,180 L68,286 L84,286 L96,196 L112,286 L128,286 L112,176 L114,124 L132,148 L142,140 L118,96 C114,78 106,70 98,68 Z',
    ],
  },
  {
    id: 'walking-candid',
    name: 'Bước đi tự nhiên',
    category: 'Chuyển động',
    defaultTip: 'Bước nhẹ về phía trước hoặc chéo khung hình, mắt nhìn sang hướng khác để tạo cảm giác tự nhiên.',
    head: { cx: 108, cy: 46, r: 17 },
    paths: [
      'M94,68 C82,76 74,94 64,126 L48,154 L60,160 L78,132 L86,174 L60,278 L76,284 L102,196 L130,282 L146,276 L116,172 L120,122 L142,148 L152,138 L126,92 C120,76 112,70 104,68 Z',
    ],
  },
  {
    id: 'hand-hair',
    name: 'Vuốt tóc / Che nắng',
    category: 'Chân dung',
    defaultTip: 'Đưa một tay lên chạm nhẹ tóc hoặc che nắng ngang trán, nghiêng đầu nhẹ tạo nét mềm mại.',
    head: { cx: 100, cy: 50, r: 18 },
    paths: [
      'M84,74 C72,82 66,102 64,136 L58,176 L72,178 L78,140 L82,182 L78,285 L94,285 L100,196 L110,285 L126,285 L118,182 L122,126 L142,96 L126,56 L116,64 L126,94 L112,112 C110,88 106,78 100,74 Z',
    ],
  },
  {
    id: 'holding-prop',
    name: 'Cầm hoa / Phụ kiện',
    category: 'Đạo cụ',
    defaultTip: 'Một tay nâng nhẹ hoa/ly nước ngang ngực, tay kia thả lỏng hoặc bước nhẹ một chân sang bên.',
    head: { cx: 102, cy: 46, r: 17 },
    paths: [
      'M86,68 C74,76 68,94 64,124 L46,110 L38,120 L66,144 L80,178 L72,286 L88,286 L100,196 L116,286 L132,286 L118,178 L124,128 L142,158 L154,152 L134,100 C128,78 118,70 108,68 Z',
      'M34,88 C30,100 34,114 44,116 C54,114 58,100 54,88 Z',
    ],
  },
  {
    id: 'half-body-lean',
    name: 'Tựa lan can / Tường',
    category: 'Bán thân',
    defaultTip: 'Tựa nhẹ hông hoặc khuỷu tay vào lan can/tường, người hơi ngả về trước tạo chiều sâu.',
    head: { cx: 96, cy: 52, r: 18 },
    paths: [
      'M80,76 C68,84 62,108 60,144 L44,180 L58,186 L74,152 L80,194 L76,286 L94,286 L102,202 L114,286 L130,286 L120,192 L128,144 L148,166 L158,156 L134,110 C126,86 116,78 106,76 Z',
      'M20,186 L180,186',
    ],
  },
  {
    id: 'cafe-sitting',
    name: 'Ngồi quán cafe',
    category: 'Ngồi',
    defaultTip: 'Ngồi hơi nghiêng người về mép ghế, một tay đặt nhẹ lên bàn hoặc chống cằm, lưng giữ thẳng.',
    head: { cx: 104, cy: 62, r: 17 },
    paths: [
      'M88,84 C76,92 70,112 68,146 L52,168 L62,178 L80,158 L84,196 L134,202 L144,274 L160,274 L148,188 L112,182 L116,134 L138,158 L148,148 L124,108 C118,92 112,86 104,84 Z',
      'M40,178 L110,178',
    ],
  },
  {
    id: 'looking-back',
    name: 'Quay lưng ngoái đầu',
    category: 'Nghệ thuật',
    defaultTip: 'Quay lưng về phía ống kính, xoay đầu qua vai nhìn lại hoặc nhìn theo cảnh vật phía xa.',
    head: { cx: 100, cy: 48, r: 17 },
    paths: [
      'M82,70 C72,78 66,98 64,132 L58,176 L72,178 L78,136 L82,182 L76,286 L92,286 L100,194 L112,286 L128,286 L118,182 L122,136 L130,174 L144,170 L134,110 C128,82 120,74 112,70 Z',
    ],
  },
  {
    id: 'squat-street',
    name: 'Ngồi bậc thềm / Street',
    category: 'Ngồi',
    defaultTip: 'Ngồi thấp trên bậc thềm, một đầu gối nâng cao để tay tựa lên, tạo dáng phóng khoáng.',
    head: { cx: 100, cy: 76, r: 17 },
    paths: [
      'M84,98 C72,108 66,132 68,166 L54,218 L72,222 L82,178 L100,206 L82,276 L98,280 L114,218 L136,278 L152,272 L128,184 L138,144 L154,174 L166,166 L134,116 C126,104 116,98 106,98 Z',
    ],
  },
  {
    id: 'minimal-center',
    name: 'Đứng giữa cảnh rộng',
    category: 'Phong cảnh',
    defaultTip: 'Đứng chính giữa khung hình, hai tay giang nhẹ hoặc đút túi để tôn lên độ rộng của phong cảnh.',
    head: { cx: 100, cy: 78, r: 13 },
    paths: [
      'M88,96 L64,126 L72,132 L88,112 L88,168 L82,256 L94,256 L100,182 L106,256 L118,256 L112,168 L112,112 L128,132 L136,126 L112,96 Z',
    ],
  },
  {
    id: 'couple-standing',
    name: 'Cặp đôi đứng cạnh',
    category: '2 người',
    defaultTip: 'Hai người đứng sát vai nhau, một người hơi quay mặt nhìn đối phương hoặc cùng hướng về ống kính.',
    head: { cx: 78, cy: 52, r: 16 },
    paths: [
      'M64,72 C54,80 50,104 48,146 L46,184 L58,184 L62,140 L64,184 L58,284 L72,284 L78,196 L86,284 L100,284 L92,184 L94,116 C92,84 86,74 78,72 Z',
      'M124,42 A15,15 0 1,0 124.1,42 Z',
      'M110,78 C102,86 98,112 96,154 L94,186 L108,186 L112,186 L106,284 L120,284 L126,198 L134,284 L148,284 L140,184 L144,124 L156,168 L168,164 L152,102 C146,84 138,78 128,78 Z',
    ],
  },
];

export function getPoseById(id: string): PoseTemplate {
  return POSE_TEMPLATES.find((p) => p.id === id) || POSE_TEMPLATES[0];
}
