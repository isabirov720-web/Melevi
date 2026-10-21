"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ru">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "48px 16px", textAlign: "center" }}>
        <h1>Что-то пошло не так · Something went wrong</h1>
        <p>Сайт временно недоступен. Попробуйте обновить страницу.</p>
        <button type="button" onClick={reset} style={{ padding: "12px 24px", marginTop: 16 }}>Повторить / Retry</button>
      </body>
    </html>
  );
}
