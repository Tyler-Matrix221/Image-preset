export interface TrendingStyle {
  id: string;
  name: string;
  tag: string;
  badge?: string;
  desc: string;
  prompt: string;
}

/**
 * Danh sách các gói màu Hot Trend TikTok / Douyin / Instagram Reels
 * được chia thành các bộ xu hướng xoay vòng tự động theo tuần trong năm.
 */
export const TIKTOK_WEEKLY_TRENDS: Record<number, TrendingStyle[]> = {
  // Bộ 1: Tuần 1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49
  0: [
    {
      id: 'douyin-muse',
      name: 'Douyin Nàng thơ',
      tag: '#DouyinMakeup',
      badge: 'Hot TikTok',
      desc: 'Da trắng sứ mịn màng, má ửng hồng đào, ánh sáng mơ màng',
      prompt:
        'Phong cách Douyin nàng thơ thịnh hành TikTok: làn da trắng sứ mịn màng phát sáng tự nhiên, vùng má ửng hồng cam đào rạng rỡ, điểm sáng highlight mềm dịu như phủ sương, tương phản nhẹ nhàng, bóng tối hơi nâng nhẹ mang cảm giác mơ màng điện ảnh.',
    },
    {
      id: 'y2k-hongkong',
      name: 'Y2K Phim Hồng Kông',
      tag: '#HongKongVibe',
      badge: 'Trend 90s',
      desc: 'Tông phim điện ảnh hoài niệm thập niên 90, ánh vàng xanh lục',
      prompt:
        'Phong cách điện ảnh Hồng Kông thập niên 90 hot trend TikTok: tông màu ấm hoài niệm với sắc vàng hổ phách và xanh rêu cổ điển ở vùng tối, tương phản đậm đà, màu đỏ và cam nổi bật điện ảnh, da người ấm áp tự nhiên.',
    },
    {
      id: 'clean-girl-korean',
      name: 'Hàn Quốc Clean Girl',
      tag: '#CleanGirl',
      badge: 'Thịnh hành',
      desc: 'Trong trẻo, tươi sáng tự nhiên, da căng bóng mọng nước',
      prompt:
        'Phong cách Clean Girl Hàn Quốc thịnh hành TikTok: ánh sáng trong veo tinh khiết, làn da căng bóng mịn màng tự nhiên không bị ám màu, độ tương phản êm dịu, bảo toàn tông da chân thực tươi tắn.',
    },
    {
      id: 'old-money-aesthetic',
      name: 'Old Money Cổ điển',
      tag: '#OldMoney',
      badge: 'Sang trọng',
      desc: 'Tông trầm ấm trung tính sang trọng, giảm màu chói',
      prompt:
        'Phong cách Old Money Aesthetic sang trọng quý phái trên TikTok: tông màu trầm ấm trung tính, giảm nhẹ độ rực rỡ của các màu chói, độ tương phản sâu lắng, da người sáng khỏe tự nhiên, cảm giác thanh lịch đẳng cấp.',
    },
  ],

  // Bộ 2: Tuần 2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50
  1: [
    {
      id: 'sunset-golden-hour',
      name: 'Golden Hour Hoàng hôn',
      tag: '#GoldenHour',
      badge: 'Triệu view',
      desc: 'Ánh nắng chiều vàng óng ả, phủ vàng rực rỡ vùng sáng',
      prompt:
        'Phong cách Golden Hour hoàng hôn rực rỡ trên TikTok: ánh nắng chiều tà ấm áp nhuộm vàng cam lấp lánh vùng sáng, da mặt ửng nắng ấm rạng ngời, vùng tối giữ độ sâu ấm cúng, màu trời và ánh sáng lãng mạn quyến rũ.',
    },
    {
      id: 'kodak-portra-vintage',
      name: 'Kodak Portra Analog',
      tag: '#FilmVintage',
      badge: 'Hot Film',
      desc: 'Màu phim hạt analog kinh điển, sắc vàng cam da ấm',
      prompt:
        'Phong cách ảnh phim Kodak Portra 400 cổ điển viral TikTok: dải màu pastel ấm áp nịnh da, vùng tối ngả xanh lục nhẹ đặc trưng của phim nhựa, điểm đen nâng mờ nhẹ nhàng, màu sắc chân thực giàu cảm xúc.',
    },
    {
      id: 'moody-cafe-vibes',
      name: 'Moody Cafe Chiều mưa',
      tag: '#MoodyVibes',
      badge: 'Sâu lắng',
      desc: 'Tông nâu gỗ trầm ấm, tương phản cao, xanh rêu trầm',
      prompt:
        'Phong cách Moody Cafe chiều mưa ấm cúng: sắc nâu gỗ ấm áp, tương phản có chiều sâu, xanh lá trầm dịu mắt, ánh đèn vàng ấm tạo cảm giác bình yên và tĩnh lặng, da giữ tông ấm tự nhiên.',
    },
    {
      id: 'cyberpunk-neon-night',
      name: 'Cyberpunk Neon Đêm',
      tag: '#Cyberpunk',
      badge: 'Cực chất',
      desc: 'Tương phản xanh tím neon và cam hồng rực rỡ',
      prompt:
        'Phong cách Neon Cyberpunk đêm huyền ảo viral TikTok: đối lập mạnh mẽ giữa xanh dương/tím neon vùng tối và cam rực rỡ vùng sáng, độ tương phản sắc nét, tạo vẻ cá tính hiện đại.',
    },
  ],

  // Bộ 3: Tuần 3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51
  2: [
    {
      id: 'paris-chic-pastel',
      name: 'Paris Chic Pastel',
      tag: '#FrenchVibe',
      badge: 'Thanh lịch',
      desc: 'Nhẹ nhàng lãng mạn kiểu Pháp, tương phản êm dịu',
      prompt:
        'Phong cách Paris Chic thanh lịch kiểu Pháp: bảng màu pastel dịu nhẹ, ánh sáng mềm mại không gắt, tương phản êm ái, màu da trắng hồng thanh thoát, phong thái lãng mạn tự nhiên.',
    },
    {
      id: 'dark-academia-classic',
      name: 'Dark Academia Cổ thư',
      tag: '#DarkAcademia',
      badge: 'Kinh điển',
      desc: 'Trầm mặc bí ẩn, tông màu gỗ sồi, rêu phong và nâu đất',
      prompt:
        'Phong cách Dark Academia kinh điển trên TikTok: tông nâu trầm ấm áp của gỗ sồi và giấy cổ, vùng tối hơi ngả rêu phong, ánh sáng cổ kính bí ẩn, da người tự nhiên có chiều sâu điện ảnh.',
    },
    {
      id: 'summer-amalfi-sun',
      name: 'Địa Trung Hải Amalfi',
      tag: '#SummerAesthetic',
      badge: 'Nắng hè',
      desc: 'Biển xanh coban rực rỡ, da rám nắng óng ả khỏe khoắn',
      prompt:
        'Phong cách mùa hè Địa Trung Hải rực rỡ viral TikTok: sắc xanh coban trong vắt của nước biển, ánh nắng vàng rực rỡ đầy năng lượng, da bánh mật rám nắng khỏe khoắn óng ánh.',
    },
    {
      id: 'fairy-core-dreamy',
      name: 'Fairycore Thần tiên',
      tag: '#FairyCore',
      badge: 'Mơ màng',
      desc: 'Xanh ngọc lục bảo mơ màng, ánh sáng mềm như sương',
      prompt:
        'Phong cách Fairycore thần tiên huyền ảo: màu xanh lục tự nhiên tươi tắn, ánh sáng lan tỏa mềm dịu như trong rừng cổ tích, sắc hồng đào nhẹ nhàng vùng má, ánh sáng lung linh huyền ảo.',
    },
  ],

  // Bộ 4: Tuần 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52
  3: [
    {
      id: 'tokyo-street-night',
      name: 'Tokyo Night Phố đêm',
      tag: '#TokyoVibes',
      badge: 'Điện ảnh',
      desc: 'Ánh đèn neon phản chiếu, vùng tối sâu, sắc lam và cam',
      prompt:
        'Phong cách Tokyo Street Night điện ảnh: sắc lam đậm sâu lắng ở vùng tối, ánh đèn neon vàng cam rực rỡ phản chiếu lung linh, tương phản ấn tượng, da người nổi bật điện ảnh.',
    },
    {
      id: 'barbie-pink-summer',
      name: 'Barbiecore Hồng phấn',
      tag: '#BarbieCore',
      badge: 'Ngọt ngào',
      desc: 'Tone hồng pastel ngọt ngào, da trắng hồng rạng rỡ',
      prompt:
        'Phong cách Barbiecore ngọt ngào trẻ trung trên TikTok: sắc hồng pastel tươi tắn nhẹ nhàng, da trắng hồng rạng ngời ngây thơ, độ tương phản tươi sáng và nịnh mắt tuyệt đối.',
    },
    {
      id: 'retro-nordic-chill',
      name: 'Nordic Chill Bắc Âu',
      tag: '#NordicStyle',
      badge: 'Tối giản',
      desc: 'Lạnh lẽo thanh thoát, tone xám bạc và xanh băng',
      prompt:
        'Phong cách Nordic Chill Bắc Âu tối giản: tông màu lạnh thanh thoát, xanh băng và xám tro tinh tế ở cảnh vật nhưng vẫn giữ màu da ấm áp hài hòa, cảm giác tĩnh lặng hiện đại.',
    },
    {
      id: 'vintage-polaroid-flash',
      name: 'Polaroid Flash Tiệc tùng',
      tag: '#PartyFlash',
      badge: 'Cháy phố',
      desc: 'Đánh flash trực diện, bóng đổ sắc nét, màu sắc bùng nổ',
      prompt:
        'Phong cách ảnh chụp Flash trực diện phong cách Polaroid tiệc tùng viral TikTok: màu sắc bùng nổ sống động, vùng sáng nổi bật cá tính, bóng đổ sắc nét chân thực, làn da tươi tắn rạng rỡ đầy năng lượng.',
    },
  ],
};

/**
 * Tính số tuần ISO của năm hiện tại (1–52)
 */
export function getIsoWeekNumber(d: Date = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Lấy danh sách các phong cách Hot Trend TikTok của tuần hiện tại (hoặc tuần chỉ định)
 */
export function getWeeklyTrendingStyles(weekOffset = 0): {
  weekNum: number;
  styles: TrendingStyle[];
} {
  const currentWeek = getIsoWeekNumber();
  const targetWeek = currentWeek + weekOffset;
  const packIndex = Math.abs(targetWeek) % 4;
  return {
    weekNum: ((targetWeek - 1 + 52) % 52) + 1,
    styles: TIKTOK_WEEKLY_TRENDS[packIndex] || TIKTOK_WEEKLY_TRENDS[0],
  };
}
