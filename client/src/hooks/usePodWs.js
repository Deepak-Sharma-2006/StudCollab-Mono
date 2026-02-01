import { useEffect, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export default function usePodWs({ podId, onMessage }) {
    const clientRef = useRef(null)
    const subscriptionRef = useRef(null)

    useEffect(() => {
        if (!podId) return

        const client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8080/ws-studcollab', null, {
                transports: ['websocket']
            }),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log(`✅ WebSocket connected for pod ${podId}`);

                // ✅ CRITICAL: Unsubscribe from previous subscription if exists
                if (subscriptionRef.current) {
                    subscriptionRef.current.unsubscribe();
                    console.log(`🔄 Unsubscribed from previous topic for pod ${podId}`);
                }

                // ✅ CRITICAL: Subscribe with proper functional callback
                subscriptionRef.current = client.subscribe(`/topic/pod.${podId}.chat`, (msg) => {
                    try {
                        const payload = JSON.parse(msg.body)
                        console.log(`💬 Real-time message received for pod ${podId}:`, payload);

                        // ✅ CRITICAL: Use callback reference directly
                        if (onMessage) {
                            onMessage(payload)
                        }
                    } catch (e) {
                        console.error('❌ Invalid WS message format:', e)
                    }
                });

                console.log(`📡 Subscribed to /topic/pod.${podId}.chat`);
            },
            onStompError: (frame) => {
                console.error('❌ STOMP error:', frame)
            },
            onDisconnect: () => {
                console.log(`🔴 WebSocket disconnected for pod ${podId}`);
                if (subscriptionRef.current) {
                    subscriptionRef.current.unsubscribe();
                    subscriptionRef.current = null;
                }
            }
        })

        client.activate()
        clientRef.current = client

        return () => {
            console.log(`🧹 Cleaning up WebSocket for pod ${podId}`);
            try {
                if (subscriptionRef.current) {
                    subscriptionRef.current.unsubscribe();
                    subscriptionRef.current = null;
                }
                if (clientRef.current) {
                    clientRef.current.deactivate();
                }
            } catch (err) {
                console.error('Error during cleanup:', err);
            }
        }
    }, [podId, onMessage])

    const send = (payload) => {
        if (!clientRef.current || !clientRef.current.connected) {
            console.warn('⚠️ WebSocket not connected, cannot send message');
            return
        }

        console.log(`📤 Sending message to /app/pod.${podId}.chat:`, payload);
        clientRef.current.publish({
            destination: `/app/pod.${podId}.chat`,
            body: JSON.stringify(payload)
        });
    }

    return { send }
}
