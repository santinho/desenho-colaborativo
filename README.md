# Desenho Colaborativo - Quarkus Application

🎨 **Aplicação de desenho colaborativo em tempo real usando Quarkus e WebSockets**

## 🚀 Funcionalidades

- **Salas com códigos únicos** - Cada sala tem desenho isolado
- **Desenho em tempo real** via WebSockets
- **Ferramentas**: Pincel, Borracha, Spray
- **Personalização**: Cores e tamanhos
- **Multi-usuário**: Vários jogadores por sala
- **Reconexão automática** em caso de queda
- **Interface responsiva** para desktop e mobile
- **Zoom**: Aproximar/Afastar o canvas com Alt + ↑ / Alt + ↓

## 🛠️ Tecnologias

- **Backend**: Quarkus (Java)
- **WebSockets**: Comunicação em tempo real
- **Frontend**: HTML5 Canvas + JavaScript vanilla
- **Build**: Maven

## 📋 Pré-requisitos

- Java 17 ou superior
- Maven 3.8.1 ou superior

## 🏃‍♂️ Como executar

### Modo desenvolvimento (recomendado):
```bash
./mvnw compile quarkus:dev
```

### Modo produção:
```bash
./mvnw clean package
java -jar target/quarkus-app/quarkus-run.jar
```

## 🌐 Acesso

Após iniciar a aplicação, acesse:
- **Interface**: http://localhost:8080
- **Health Check**: http://localhost:8080/api/rooms/health

## 🎮 Como usar

1. **Acesse a aplicação** no navegador
2. **Digite seu nome**
3. **Escolha uma opção**:
   - **"Criar Nova Sala"**: Gera código automaticamente
   - **"Entrar na Sala"**: Digite um código existente
4. **Desenhe colaborativamente** com outros usuários!

## 🏗️ Arquitetura

### Backend (Quarkus)
- **WebSocket Endpoint**: `/drawing` - Comunicação em tempo real
- **REST API**: `/api/rooms/*` - Criação de salas
- **Room Service**: Gerenciamento de salas e jogadores
- **Message Types**: JOIN_ROOM, LEAVE_ROOM, CANVAS_UPDATE, DRAWING_ACTION, CLEAR_CANVAS

### Frontend
- **HTML5 Canvas**: Desenho suave com eventos mouse/touch
- **WebSocket Client**: Sincronização automática
- **State Management**: Reconexão e controle de estado
- **Responsive Design**: Funciona em desktop e mobile

## 🔧 Configurações

Arquivo: `src/main/resources/application.properties`

- **Porta HTTP**: `quarkus.http.port=8080`
- **WebSocket Frame Size**: `1MB` (para imagens grandes)
- **CORS**: Habilitado para desenvolvimento
- **Logs**: Debug para pacote `com.desenho`

## 📁 Estrutura do Projeto

```
src/
├── main/
│   ├── java/com/desenho/
│   │   ├── model/           # Modelos de dados
│   │   ├── service/         # Lógica de negócio
│   │   ├── websocket/       # WebSocket endpoints
│   │   └── resource/        # REST endpoints
│   └── resources/
│       ├── META-INF/resources/  # Arquivos estáticos (HTML, CSS, JS)
│       └── application.properties
└── test/                    # Testes unitários
```

## 🐛 Troubleshooting

### WebSocket não conecta
- Verifique se a aplicação está rodando na porta 8080
- Confirme que não há firewall bloqueando WebSockets

### Canvas não sincroniza
- Verifique a conexão (indicador no canto superior direito)
- Teste a reconexão automática

### Erro ao criar sala
- Verifique os logs da aplicação
- Confirme que o endpoint `/api/rooms/create` está acessível

## 🚀 Deploy

### Docker (futuro)
```bash
./mvnw clean package -Pnative -Dquarkus.native.container-build=true
docker build -f src/main/docker/Dockerfile.native -t desenho-colaborativo .
docker run -i --rm -p 8080:8080 desenho-colaborativo
```

### Cloud Native
Quarkus oferece suporte nativo para:
- Kubernetes
- OpenShift
- Cloud providers (AWS, Azure, GCP)

## 📈 Próximas funcionalidades

- [ ] Histórico de desenhos
- [ ] Salas persistentes
- [ ] Mais ferramentas de desenho
- [ ] Chat integrado
- [ ] Autenticação de usuários
- [ ] Temas personalizáveis

---

**Desenvolvido com ❤️ usando Quarkus**
