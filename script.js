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
const N8N_WEBHOOK_URL = 'https://n8n.autorepuestosexpress.com/webhook/f8a39070-7c24-4ca6-8580-2b5fd3bff523';
const USE_N8N = true;// Cambiar a true cuando tengas configurado n8n

// Toggle del chat
chatButton.addEventListener("click", () => {
    chatWindow.classList.toggle("show");
    if (chatWindow.classList.contains("show")) {
        chatInput.focus();
    }
});

// Función para generar ID único de usuario
function generateUserId() {
    let userId = localStorage.getItem('chatUserId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('chatUserId', userId);
    }
    return userId;
}

// Función para agregar mensajes
function addMessage(text, sender = "bot") {
    const msg = document.createElement("div");
    msg.className = sender;
    msg.textContent = text;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
    
    // Animar entrada del mensaje
    setTimeout(() => {
        msg.style.opacity = '1';
        msg.style.transform = 'translateY(0)';
    }, 10);
}

// Función para mostrar indicador de escritura
function showTypingIndicator() {
    const typingMsg = document.createElement("div");
    typingMsg.className = "bot typing-indicator";
    typingMsg.innerHTML = "⏳ Jarvis está escribiendo...";
    typingMsg.id = "typing-indicator";
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

// Función para enviar mensaje a n8n
async function sendToN8n(message) {
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                userId: generateUserId(),
                timestamp: new Date().toISOString(),
                source: 'website_chat'
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data.reply || data.message || getBotResponse(message);
        
    } catch (error) {
        console.error('Error connecting to n8n:', error);
        // Fallback a respuestas locales si n8n no está disponible
        return getBotResponse(message);
    }
}

// Función principal para enviar mensajes
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Agregar mensaje del usuario
    addMessage(message, "user");
    chatInput.value = "";
    
    // Mostrar indicador de escritura
    const typingIndicator = showTypingIndicator();
    
    try {
        let response;
        
        if (USE_N8N) {
            // Usar n8n si está habilitado
            response = await sendToN8n(message);
        } else {
            // Usar respuestas locales
            await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay
            response = getBotResponse(message);
        }
        
        // Remover indicador y mostrar respuesta
        removeTypingIndicator();
        addMessage(response, "bot");
        
    } catch (error) {
        removeTypingIndicator();
        console.error('Error:', error);
        addMessage("Lo siento, hubo un problema técnico. Por favor intenta de nuevo. 🔧", "bot");
    }
}

// Event listeners
sendButton.addEventListener("click", sendMessage);

chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});

// Mensaje de bienvenida
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        addMessage("¡Hola! Soy Jarvis 🤖 ¿En qué puedo ayudarte con nuestros servicios de automatización?");
    }, 1000);
});

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