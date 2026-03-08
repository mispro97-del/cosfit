// ============================================================
// COSFIT - Email Notification Service
// Resend API를 통한 트랜잭션 이메일 발송
// RESEND_API_KEY 환경변수 필요 (https://resend.com)
// ============================================================

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // 개발 환경에서는 콘솔 출력으로 대체
    console.log("[Email (DEV)]", payload.to, payload.subject);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `COSFIT <noreply@${process.env.EMAIL_DOMAIN ?? "cosfit.kr"}>`,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email send failed: ${err}`);
  }
}

// ── 주문 확인 이메일 ──

export async function sendOrderConfirmEmail(opts: {
  to: string;
  userName: string;
  orderNumber: string;
  finalAmount: number;
  items: { productName: string; quantity: number; unitPrice: number }[];
}): Promise<void> {
  const itemRows = opts.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0ebe8;">${i.productName}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0ebe8;text-align:center;">${i.quantity}개</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0ebe8;text-align:right;">${i.unitPrice.toLocaleString()}원</td>
        </tr>`
    )
    .join("");

  await sendEmail({
    to: opts.to,
    subject: `[COSFIT] 주문이 접수되었습니다 (${opts.orderNumber})`,
    html: `
      <div style="font-family:Apple SD Gothic Neo,sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#10B981;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">COSFIT</h1>
        </div>
        <div style="padding:32px 24px;">
          <p style="font-size:15px;">안녕하세요, <strong>${opts.userName}</strong>님!</p>
          <p style="font-size:15px;">주문이 성공적으로 접수되었습니다.</p>
          <div style="background:#FBF7F4;border-radius:12px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 4px;font-size:12px;color:#888;">주문번호</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#10B981;">${opts.orderNumber}</p>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:2px solid #e5ddd8;">
                <th style="padding:8px 0;text-align:left;font-size:13px;color:#888;">상품</th>
                <th style="padding:8px 0;text-align:center;font-size:13px;color:#888;">수량</th>
                <th style="padding:8px 0;text-align:right;font-size:13px;color:#888;">금액</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div style="text-align:right;margin-top:16px;padding-top:16px;border-top:2px solid #333;">
            <span style="font-size:14px;color:#888;">총 결제금액</span>
            <span style="font-size:20px;font-weight:700;margin-left:12px;color:#10B981;">${opts.finalAmount.toLocaleString()}원</span>
          </div>
          <p style="margin-top:32px;font-size:13px;color:#888;text-align:center;">
            궁금한 점은 고객센터(support@cosfit.kr)로 문의해 주세요.
          </p>
        </div>
      </div>
    `,
  });
}

// ── 배송 시작 이메일 ──

export async function sendShippingStartEmail(opts: {
  to: string;
  userName: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: `[COSFIT] 주문하신 상품이 발송되었습니다 (${opts.orderNumber})`,
    html: `
      <div style="font-family:Apple SD Gothic Neo,sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#10B981;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">COSFIT</h1>
        </div>
        <div style="padding:32px 24px;">
          <p style="font-size:15px;">안녕하세요, <strong>${opts.userName}</strong>님!</p>
          <p style="font-size:15px;">주문하신 상품이 발송되었습니다. 🚚</p>
          <div style="background:#FBF7F4;border-radius:12px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 12px;"><span style="font-size:12px;color:#888;">주문번호</span><br /><strong>${opts.orderNumber}</strong></p>
            <p style="margin:0 0 12px;"><span style="font-size:12px;color:#888;">택배사</span><br /><strong>${opts.carrier}</strong></p>
            <p style="margin:0;"><span style="font-size:12px;color:#888;">운송장 번호</span><br /><strong style="font-size:18px;color:#10B981;">${opts.trackingNumber}</strong></p>
          </div>
          <p style="font-size:13px;color:#888;text-align:center;">
            택배사 홈페이지에서 배송 현황을 확인하실 수 있습니다.
          </p>
        </div>
      </div>
    `,
  });
}
