#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# HobbyZamora — Vultr Server Setup (Ubuntu 22.04 / 24.04)
# Run as root on a fresh Vultr instance.
#
# Usage (IP only — no domain):
#   bash setup-vultr.sh --ssh-port 2222 --deploy-user deploy \
#     --repo git@github.com:jamaral21/hobbyzamora.git
#
# Usage (with domain + SSL):
#   bash setup-vultr.sh --domain hobbyzamora.com --email admin@hobbyzamora.com \
#     --ssh-port 2222 --deploy-user deploy \
#     --repo git@github.com:jamaral21/hobbyzamora.git
# ==============================================================================

# ── Defaults ──────────────────────────────────────────────────────────────────
DOMAIN=""
EMAIL=""
SSH_PORT="2222"
DEPLOY_USER="deploy"
NODE_MAJOR=20
APP_NAME="hobbyzamora"
APP_PORT=3001
BASE_DIR="/var/www/${APP_NAME}"
SERVICE_NAME="${APP_NAME}-api"
REPO_URL=""
SWAP_SIZE="2G"

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)      DOMAIN="$2";      shift 2 ;;
    --email)       EMAIL="$2";       shift 2 ;;
    --ssh-port)    SSH_PORT="$2";    shift 2 ;;
    --deploy-user) DEPLOY_USER="$2"; shift 2 ;;
    --repo)        REPO_URL="$2";    shift 2 ;;
    --node)        NODE_MAJOR="$2";  shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Auto-detect server public IP
SERVER_IP="$(curl -4 -s --max-time 10 ifconfig.me || true)"

# Domain is optional — fall back to server IP
if [[ -z "${DOMAIN}" ]]; then
  DOMAIN="${SERVER_IP}"
  USE_IP_ONLY=true
  warn() { printf '\033[1;33m  ⚠ %s\033[0m\n' "$*"; }
  echo ""
  echo "  ℹ  Sin dominio — usando IP: ${SERVER_IP}"
  echo "     Cuando tengas dominio ejecuta de nuevo con --domain"
  echo ""
else
  USE_IP_ONLY=false
fi

log()   { printf '\n\033[1;34m▸ %s\033[0m\n' "$*"; }
ok()    { printf '\033[1;32m  ✔ %s\033[0m\n' "$*"; }
warn()  { printf '\033[1;33m  ⚠ %s\033[0m\n' "$*"; }

# ══════════════════════════════════════════════════════════════════════════════
# 1. System update & essentials
# ══════════════════════════════════════════════════════════════════════════════
log "Actualizando sistema operativo"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git ufw fail2ban unattended-upgrades \
  build-essential sqlite3 nginx certbot python3-certbot-nginx \
  logrotate htop ncdu
ok "Sistema actualizado"

# ══════════════════════════════════════════════════════════════════════════════
# 2. Swap (Vultr instances with little RAM)
# ══════════════════════════════════════════════════════════════════════════════
log "Configurando swap (${SWAP_SIZE})"
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l "${SWAP_SIZE}" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Optimise swap usage
  sysctl vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  ok "Swap habilitado"
else
  ok "Swap ya existe"
fi

# ══════════════════════════════════════════════════════════════════════════════
# 3. Deploy user (no password login)
# ══════════════════════════════════════════════════════════════════════════════
log "Creando usuario '${DEPLOY_USER}'"
if ! id "${DEPLOY_USER}" &>/dev/null; then
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
  usermod -aG sudo "${DEPLOY_USER}"
  # Allow sudo without password for deploy tasks
  echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/${DEPLOY_USER}"
  chmod 440 "/etc/sudoers.d/${DEPLOY_USER}"
fi

# Copy root SSH keys to deploy user
if [[ -f /root/.ssh/authorized_keys ]]; then
  mkdir -p "/home/${DEPLOY_USER}/.ssh"
  cp /root/.ssh/authorized_keys "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
  chmod 700 "/home/${DEPLOY_USER}/.ssh"
  chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
fi
ok "Usuario ${DEPLOY_USER} listo"

# ══════════════════════════════════════════════════════════════════════════════
# 4. SSH Hardening
# ══════════════════════════════════════════════════════════════════════════════
log "Hardening SSH (puerto ${SSH_PORT})"
SSHD_CONFIG="/etc/ssh/sshd_config"
cp "${SSHD_CONFIG}" "${SSHD_CONFIG}.bak.$(date +%s)"

# Apply settings idempotently
apply_sshd() {
  local key="$1" value="$2"
  if grep -q "^${key}" "${SSHD_CONFIG}"; then
    sed -i "s/^${key}.*/${key} ${value}/" "${SSHD_CONFIG}"
  else
    echo "${key} ${value}" >> "${SSHD_CONFIG}"
  fi
}

apply_sshd "Port"                  "${SSH_PORT}"
apply_sshd "PermitRootLogin"       "no"
apply_sshd "PasswordAuthentication" "no"
apply_sshd "PubkeyAuthentication"  "yes"
apply_sshd "X11Forwarding"         "no"
apply_sshd "MaxAuthTries"          "3"
apply_sshd "LoginGraceTime"        "20"
apply_sshd "AllowUsers"            "${DEPLOY_USER}"
apply_sshd "ClientAliveInterval"   "300"
apply_sshd "ClientAliveCountMax"   "2"
apply_sshd "Protocol"              "2"

systemctl restart sshd
ok "SSH hardened — Puerto: ${SSH_PORT}"

# ══════════════════════════════════════════════════════════════════════════════
# 5. Firewall (UFW)
# ══════════════════════════════════════════════════════════════════════════════
log "Configurando firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp" comment "SSH"
ufw allow 80/tcp  comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable
ok "Firewall activo (puertos: ${SSH_PORT}, 80, 443)"

# ══════════════════════════════════════════════════════════════════════════════
# 6. Fail2Ban
# ══════════════════════════════════════════════════════════════════════════════
log "Configurando Fail2Ban"
cat > /etc/fail2ban/jail.local <<JAILEOF
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port    = ${SSH_PORT}
filter  = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
JAILEOF

systemctl enable fail2ban
systemctl restart fail2ban
ok "Fail2Ban activo"

# ══════════════════════════════════════════════════════════════════════════════
# 7. Automatic Security Updates
# ══════════════════════════════════════════════════════════════════════════════
log "Habilitando actualizaciones automáticas de seguridad"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<APTEOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
APTEOF
ok "Actualizaciones automáticas habilitadas"

# ══════════════════════════════════════════════════════════════════════════════
# 8. Kernel / sysctl hardening
# ══════════════════════════════════════════════════════════════════════════════
log "Hardening kernel (sysctl)"
cat > /etc/sysctl.d/99-hardening.conf <<SYSEOF
# Prevent IP spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Disable source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# SYN flood protection
net.ipv4.tcp_syncookies = 1

# Ignore ICMP broadcasts
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Log martians
net.ipv4.conf.all.log_martians = 1
SYSEOF
sysctl --system >/dev/null 2>&1
ok "Kernel hardened"

# ══════════════════════════════════════════════════════════════════════════════
# 9. Node.js (via NodeSource)
# ══════════════════════════════════════════════════════════════════════════════
log "Instalando Node.js ${NODE_MAJOR}"
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -ne "${NODE_MAJOR}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
ok "Node.js $(node -v) — npm $(npm -v)"

# ══════════════════════════════════════════════════════════════════════════════
# 10. App directories & permissions
# ══════════════════════════════════════════════════════════════════════════════
log "Creando directorios de la app"
mkdir -p "${BASE_DIR}"/{releases,shared,backups}
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${BASE_DIR}"
ok "Directorios listos en ${BASE_DIR}"

# ══════════════════════════════════════════════════════════════════════════════
# 11. Shared .env template
# ══════════════════════════════════════════════════════════════════════════════
log "Creando template de .env"
ENV_FILE="${BASE_DIR}/shared/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" <<ENVEOF
# HobbyZamora — Producción
NODE_ENV=production
PORT=${APP_PORT}
DATABASE_URL="file:./prod.db"
JWT_SECRET="$(openssl rand -base64 48)"
FRONTEND_URL="http://${DOMAIN}"
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
ENVEOF
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${ENV_FILE}"
  chmod 600 "${ENV_FILE}"
  ok "Template .env creado — EDITA los valores antes del primer deploy"
else
  ok ".env ya existe, no se sobreescribe"
fi

# ══════════════════════════════════════════════════════════════════════════════
# 12. systemd service
# ══════════════════════════════════════════════════════════════════════════════
log "Creando servicio systemd: ${SERVICE_NAME}"
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<SVCEOF
[Unit]
Description=HobbyZamora API
After=network.target

[Service]
Type=simple
User=${DEPLOY_USER}
Group=${DEPLOY_USER}
WorkingDirectory=${BASE_DIR}/current
EnvironmentFile=${BASE_DIR}/shared/.env
ExecStart=/usr/bin/node dist/server/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${BASE_DIR}
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
ok "Servicio ${SERVICE_NAME} creado y habilitado"

# ══════════════════════════════════════════════════════════════════════════════
# 13. Nginx reverse proxy
# ══════════════════════════════════════════════════════════════════════════════
log "Configurando Nginx para ${DOMAIN}"
if [[ "${USE_IP_ONLY}" == true ]]; then
  NGINX_SERVER_NAME="${SERVER_IP}"
else
  NGINX_SERVER_NAME="${DOMAIN} www.${DOMAIN}"
fi

cat > "/etc/nginx/sites-available/${APP_NAME}" <<NGXEOF
server {
    listen 80;
    listen [::]:80;
    server_name ${NGINX_SERVER_NAME};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Frontend — static files built by Vite
    root ${BASE_DIR}/current/dist;
    index index.html;

    # Serve uploaded product images from shared directory
    location /uploads/ {
        alias ${BASE_DIR}/shared/uploads/;
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        client_max_body_size 20m;
        client_body_timeout 120s;

        # Rate limiting zone (defined below)
        limit_req zone=api burst=20 nodelay;
    }

    # SPA fallback — send all non-file requests to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Deny access to hidden files
    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
NGXEOF

# Add rate limiting zone to nginx.conf if not present
if ! grep -q "limit_req_zone.*api" /etc/nginx/nginx.conf; then
  sed -i '/http {/a\    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;' /etc/nginx/nginx.conf
fi

# Enable site
ln -sfn "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
ok "Nginx configurado"

# ══════════════════════════════════════════════════════════════════════════════
# 14. SSL con Let's Encrypt (solo si hay dominio)
# ══════════════════════════════════════════════════════════════════════════════
if [[ "${USE_IP_ONLY}" == true ]]; then
  log "SSL omitido (modo IP — no se puede usar Let's Encrypt sin dominio)"
  warn "Cuando tengas dominio, ejecuta:"
  warn "  certbot --nginx -d TU_DOMINIO -d www.TU_DOMINIO --non-interactive --agree-tos -m TU_EMAIL --redirect"
  warn "  Y actualiza FRONTEND_URL en ${BASE_DIR}/shared/.env a https://TU_DOMINIO"
else
  log "Obteniendo certificado SSL"
  [[ -z "${EMAIL}" ]] && { warn "--email no proporcionado, omitiendo SSL"; } || {
    DOMAIN_IP="$(dig +short "${DOMAIN}" @8.8.8.8 || true)"
    if [[ -n "${DOMAIN_IP}" && "${DOMAIN_IP}" == "${SERVER_IP}" ]]; then
      certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" \
        --non-interactive --agree-tos -m "${EMAIL}" \
        --redirect
      # Update .env to use https now that SSL is active
      sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=\"https://${DOMAIN}\"|" "${BASE_DIR}/shared/.env"
      ok "SSL instalado y redirect habilitado"
    else
      warn "DNS no apunta a este servidor aún (Server: ${SERVER_IP}, Domain: ${DOMAIN_IP})"
      warn "Ejecuta certbot manualmente cuando el DNS esté listo:"
      warn "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m ${EMAIL} --redirect"
    fi
  }
fi

# ══════════════════════════════════════════════════════════════════════════════
# 15. Logrotate para la app
# ══════════════════════════════════════════════════════════════════════════════
log "Configurando logrotate"
cat > "/etc/logrotate.d/${APP_NAME}" <<LOGEOF
/var/log/${APP_NAME}/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ${DEPLOY_USER} ${DEPLOY_USER}
    sharedscripts
}
LOGEOF
mkdir -p "/var/log/${APP_NAME}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "/var/log/${APP_NAME}"
ok "Logrotate configurado"

# ══════════════════════════════════════════════════════════════════════════════
# 16. SSH Key for GitHub (deploy key)
# ══════════════════════════════════════════════════════════════════════════════
log "Generando SSH key para GitHub deploy"
DEPLOY_KEY="/home/${DEPLOY_USER}/.ssh/id_ed25519"
if [[ ! -f "${DEPLOY_KEY}" ]]; then
  sudo -u "${DEPLOY_USER}" ssh-keygen -t ed25519 -f "${DEPLOY_KEY}" -N "" -C "${APP_NAME}-deploy"
  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo " DEPLOY KEY — Agrégala como Deploy Key en tu repo de GitHub:"
  echo "════════════════════════════════════════════════════════════════"
  cat "${DEPLOY_KEY}.pub"
  echo "════════════════════════════════════════════════════════════════"
  echo ""
fi
ok "Deploy key lista"

# ══════════════════════════════════════════════════════════════════════════════
# DONE
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  SETUP COMPLETO                                             ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║                                                                  ║"
echo "║  Próximos pasos:                                                 ║"
echo "║                                                                  ║"
echo "║  1. Copia la Deploy Key de arriba a GitHub:                      ║"
echo "║     Repo → Settings → Deploy Keys → Add                         ║"
echo "║                                                                  ║"
echo "║  2. Edita el .env de producción:                                 ║"
echo "║     nano ${BASE_DIR}/shared/.env                                 ║"
echo "║                                                                  ║"
echo "║  3. Accede a la app:                                              ║"
echo "║     http://${SERVER_IP:-TU_IP}                                    ║"
echo "║                                                                  ║"
echo "║  4. (Opcional) Cuando tengas dominio:                            ║"
echo "║     - Configura DNS: tudominio.com → ${SERVER_IP:-TU_IP}         ║"
echo "║     - Corre certbot para SSL                                     ║"
echo "║     - Actualiza FRONTEND_URL en .env                             ║"
echo "║                                                                  ║"
echo "║  5. Conéctate como deploy user:                                  ║"
echo "║     ssh -p ${SSH_PORT} ${DEPLOY_USER}@${SERVER_IP:-TU_IP}       ║"
echo "║                                                                  ║"
echo "║  6. Primer deploy:                                               ║"
echo "║     REPO_URL=${REPO_URL:-git@github.com:tu/repo.git} \\          ║"
echo "║     bash ${BASE_DIR}/current/scripts/deploy-vultr.sh             ║"
echo "║     (o clona el repo y corre el script)                          ║"
echo "║                                                                  ║"
echo "║  ⚠ IMPORTANTE: Prueba SSH con el nuevo puerto ANTES de cerrar   ║"
echo "║    tu sesión actual:                                             ║"
echo "║    ssh -p ${SSH_PORT} ${DEPLOY_USER}@${SERVER_IP:-TU_IP}        ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
