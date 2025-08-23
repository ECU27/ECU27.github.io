// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Form submission
document.getElementById('contactForm').addEventListener('submit', function (e) {
    e.preventDefault();
    alert('Gracias por tu mensaje. Nos pondremos en contacto contigo pronto.');
    this.reset();
});

// Animation on scroll
function animateOnScroll() {
    const elements = document.querySelectorAll('.service-card, .case-card, .stat-item');

    elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.3;

        if (elementPosition < screenPosition) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
}

// Initialize elements with opacity 0 for animation
document.querySelectorAll('.service-card, .case-card, .stat-item').forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'all 0.6s ease';
});

window.addEventListener('scroll', animateOnScroll);
window.addEventListener('load', animateOnScroll);

// ====================== CHATBOT FUNCTIONALITY - CORREGIDO ======================

// Variables del chatbot
const chatButton = document.getElementById("chat-button");
const chatWindow = document.getElementById("chat-window");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const chatBody = document.getElementById("chat-body");

// Configuración para n8n (CAMBIAR POR TU URL DE WEBHOOK)
// Configuración de n8n
const N8N_WEBHOOK_URL = 'https://n8n.autorepuestosexpress.com/webhook/f8a39070-7c24-4ca6-8580-2b5fd3bff523';
const USE_N8N = true;

// Configuración adicional
const CONFIG = {
    timeout: 30000, // 30 segundos
    retries: 3,
    retryDelay: 1000 // 1 segundo inicial
};

// Variables globales
let retryCount = 0;
let messageQueue = [];

// Toggle del chat
chatButton.addEventListener("click", () => {
    chatWindow.classList.toggle("show");
    if (chatWindow.classList.contains("show")) {
        chatInput.focus();
    }
});

// Función para generar ID único de usuario (sin localStorage para GitHub Pages)
function generateUserId() {
    // Usar sessionStorage que persiste durante la sesión del navegador
    let userId = sessionStorage.getItem('chatUserId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('chatUserId', userId);
    }
    return userId;
}

// Función para generar ID de sesión
function generateSessionId() {
    let sessionId = sessionStorage.getItem('chatSessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('chatSessionId', sessionId);
    }
    return sessionId;
}

// Función para agregar mensajes
function addMessage(text, sender = "bot") {
    const msg = document.createElement("div");
    msg.className = sender;
    
    // Formatear mensaje con markdown básico
    const formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>');
    
    msg.innerHTML = formattedText;
    
    // Agregar timestamp
    const timestamp = document.createElement("div");
    timestamp.className = "timestamp";
    timestamp.textContent = new Date().toLocaleTimeString();
    timestamp.style.fontSize = "0.7em";
    timestamp.style.opacity = "0.6";
    timestamp.style.marginTop = "4px";
    msg.appendChild(timestamp);
    
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
    
    // Animar entrada del mensaje
    msg.style.opacity = '0';
    msg.style.transform = 'translateY(10px)';
    msg.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
        msg.style.opacity = '1';
        msg.style.transform = 'translateY(0)';
    }, 10);
}

// Función para mostrar indicador de escritura mejorado
function showTypingIndicator() {
    const typingMsg = document.createElement("div");
    typingMsg.className = "bot typing-indicator";
    typingMsg.id = "typing-indicator";
    
    typingMsg.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span>Jarvis está escribiendo...</span>
        </div>
    `;
    
    chatBody.appendChild(typingMsg);
    chatBody.scrollTop = chatBody.scrollHeight;
    return typingMsg;
}

// Función para remover indicador de escritura
function removeTypingIndicator() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) {
        indicator.remove();
    }
}

// Función mejorada para enviar mensaje a n8n
async function sendToN8n(message) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
    
    try {
        // Payload completo para n8n
        const payload = {
            message: message,
            userId: generateUserId(),
            sessionId: generateSessionId(),
            timestamp: new Date().toISOString(),
            source: 'website_chat',
            userAgent: navigator.userAgent,
            url: window.location.href,
            referrer: document.referrer || 'direct',
            // Contexto adicional
            context: {
                previousMessages: getRecentMessages(3), // Últimos 3 mensajes para contexto
                chatStartTime: sessionStorage.getItem('chatStartTime') || new Date().toISOString()
            }
        };
        
        console.log('Enviando payload a n8n:', payload);

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Jarvis-Chat/1.0'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Verificar tipo de contenido
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // Si no es JSON, tratar como texto plano
            const text = await response.text();
            data = { message: text };
        }

        console.log('Respuesta de n8n:', data);

        // Extraer respuesta según diferentes formatos posibles
        const botResponse = data.reply || 
                          data.message || 
                          data.response || 
                          data.text ||
                          (data.data ? data.data.message : null) ||
                          'Respuesta recibida correctamente';

        // Reset retry count on success
        retryCount = 0;

        return botResponse;
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('Timeout: La petición tardó demasiado tiempo');
        }
        
        console.error('Error detallado conectando con n8n:', {
            error: error.message,
            url: N8N_WEBHOOK_URL,
            timestamp: new Date().toISOString()
        });
        
        throw error;
    }
}

// Función para obtener mensajes recientes para contexto
function getRecentMessages(count = 3) {
    const messages = Array.from(chatBody.children)
        .filter(msg => !msg.classList.contains('typing-indicator'))
        .slice(-count * 2) // Multiplicar por 2 para incluir user y bot
        .map(msg => ({
            sender: msg.className.includes('user') ? 'user' : 'bot',
            text: msg.textContent.replace(/\d{1,2}:\d{2}:\d{2}.*$/, '').trim() // Remover timestamp
        }));
    
    return messages;
}

// Función con reintentos automáticos
async function sendToN8nWithRetry(message) {
    for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
        try {
            return await sendToN8n(message);
        } catch (error) {
            console.log(`Intento ${attempt} fallido:`, error.message);
            
            if (attempt === CONFIG.retries) {
                throw error; // Si es el último intento, lanzar el error
            }
            
            // Esperar antes del siguiente intento (backoff exponencial)
            const delay = CONFIG.retryDelay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Función principal para enviar mensajes
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Agregar mensaje del usuario
    addMessage(message, "user");
    chatInput.value = "";
    
    // Guardar tiempo de inicio del chat si es el primer mensaje
    if (!sessionStorage.getItem('chatStartTime')) {
        sessionStorage.setItem('chatStartTime', new Date().toISOString());
    }
    
    // Mostrar indicador de escritura
    const typingIndicator = showTypingIndicator();
    
    try {
        let response;
        
        if (USE_N8N) {
            // Usar n8n con reintentos
            response = await sendToN8nWithRetry(message);
        } else {
            // Usar respuestas locales
            await new Promise(resolve => setTimeout(resolve, 1000));
            response = getBotResponse(message);
        }
        
        // Remover indicador y mostrar respuesta
        removeTypingIndicator();
        addMessage(response, "bot");
        
        // Disparar evento personalizado
        document.dispatchEvent(new CustomEvent('chatMessageSent', {
            detail: { message, response }
        }));
        
    } catch (error) {
        removeTypingIndicator();
        console.error('Error enviando mensaje:', error);
        
        // Mensaje de error más específico
        let errorMessage = "Lo siento, hubo un problema técnico. ";
        
        if (error.message.includes('Timeout')) {
            errorMessage += "La conexión está tardando mucho. ";
        } else if (error.message.includes('HTTP')) {
            errorMessage += "Error de servidor. ";
        } else {
            errorMessage += "Error de conexión. ";
        }
        
        errorMessage += "Por favor intenta de nuevo. 🔧";
        
        addMessage(errorMessage, "bot");
        
        // Guardar mensaje en cola para reenvío
        messageQueue.push({
            message,
            timestamp: new Date().toISOString()
        });
    }
}

// Función para reenviar mensajes en cola
async function retryQueuedMessages() {
    if (messageQueue.length === 0) return;
    
    console.log(`Reenviando ${messageQueue.length} mensajes en cola...`);
    
    const queue = [...messageQueue];
    messageQueue = [];
    
    for (const item of queue) {
        try {
            const response = await sendToN8nWithRetry(item.message);
            addMessage(`📤 Mensaje reenviado: "${item.message}"`, "user");
            addMessage(response, "bot");
        } catch (error) {
            console.error('Error reenviando mensaje:', error);
            // Volver a agregar a la cola si falla
            messageQueue.push(item);
        }
    }
}

// Event listeners
sendButton.addEventListener("click", sendMessage);

chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Mensaje de bienvenida
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        addMessage("¡Hola! Soy Jarvis 🤖 ¿En qué puedo ayudarte con nuestros servicios de automatización?");
    }, 1000);
    
    // Test de conexión inicial (opcional)
    if (USE_N8N) {
        setTimeout(testN8nConnection, 2000);
    }
});

// Función para probar conexión
async function testN8nConnection() {
    try {
        const testResponse = await sendToN8n('__CONNECTION_TEST__');
        console.log('✅ Conexión con n8n exitosa');
    } catch (error) {
        console.log('⚠️ Problema de conexión con n8n:', error.message);
    }
}

// Cerrar chat al hacer clic fuera de él
document.addEventListener('click', function(e) {
    if (!chatWindow.contains(e.target) && !chatButton.contains(e.target)) {
        chatWindow.classList.remove('show');
    }
});

// Prevenir que el chat se cierre al hacer clic dentro
chatWindow.addEventListener('click', function(e) {
    e.stopPropagation();
});

// Manejo de reconexión
window.addEventListener('online', () => {
    console.log('🌐 Conexión restaurada');
    if (messageQueue.length > 0) {
        setTimeout(retryQueuedMessages, 1000);
    }
});

window.addEventListener('offline', () => {
    console.log('📡 Sin conexión a internet');
});

// Event listener personalizado para respuestas del chat
document.addEventListener('chatMessageSent', (event) => {
    const { message, response } = event.detail;
    console.log('Mensaje enviado:', message);
    console.log('Respuesta recibida:', response);
    
    // Aquí puedes agregar lógica adicional como analytics, etc.
});

// Función de utilidad para exportar conversación
function exportChatHistory() {
    const messages = Array.from(chatBody.children)
        .filter(msg => !msg.classList.contains('typing-indicator'))
        .map(msg => ({
            sender: msg.className.includes('user') ? 'Usuario' : 'Jarvis',
            message: msg.textContent.replace(/\d{1,2}:\d{2}:\d{2}.*$/, '').trim(),
            timestamp: new Date().toISOString()
        }));
    
    return JSON.stringify(messages, null, 2);
}

// Hacer funciones disponibles globalmente
window.JarvisChat = {
    sendMessage: sendMessage,
    exportHistory: exportChatHistory,
    retryQueue: retryQueuedMessages,
    testConnection: testN8nConnection
};
