import { WebSocketServer, type WebSocket } from "ws";

export type MockRelay = {
	port: number;
	url: string;
	close: () => void;
	getEvents: () => unknown[];
	clearEvents: () => void;
	broadcastEvent: (event: unknown) => void;
};

export function createMockRelay(port: number): Promise<MockRelay> {
	return new Promise((resolve) => {
		const wss = new WebSocketServer({ port });
		const events: unknown[] = [];
		const clients = new Set<WebSocket>();

		wss.on("connection", (ws) => {
			clients.add(ws);
			ws.on("close", () => clients.delete(ws));

			ws.on("message", (data) => {
				try {
					const msg = JSON.parse(data.toString());

					if (msg[0] === "EVENT") {
						const event = msg[2];
						events.push(event);
						// OKレスポンス
						ws.send(JSON.stringify(["OK", event.id, true, ""]));
						// 他の接続中クライアントにブロードキャスト
						for (const client of clients) {
							if (client !== ws && client.readyState === ws.OPEN) {
								client.send(
									JSON.stringify(["EVENT", "broadcast", event]),
								);
							}
						}
					}

					if (msg[0] === "REQ") {
						const subId = msg[1];
						// 保存済みイベントを返す
						for (const event of events) {
							ws.send(JSON.stringify(["EVENT", subId, event]));
						}
						ws.send(JSON.stringify(["EOSE", subId]));
					}

					if (msg[0] === "CLOSE") {
						// サブスクリプション閉じ — 特に処理なし
					}
				} catch {
					// invalid JSON
				}
			});
		});

		wss.on("listening", () => {
			resolve({
				port,
				url: `ws://localhost:${port}`,
				close: () => {
					for (const client of clients) {
						client.close();
					}
					wss.close();
				},
				getEvents: () => [...events],
				clearEvents: () => {
					events.length = 0;
				},
				broadcastEvent: (event: unknown) => {
					events.push(event);
					for (const client of clients) {
						if (client.readyState === 1) {
							client.send(
								JSON.stringify(["EVENT", "broadcast", event]),
							);
						}
					}
				},
			});
		});
	});
}
