#!/bin/bash

echo "========================================"
echo "Security Glass - Servidor de Testes"
echo "========================================"
echo ""
echo "Iniciando servidor local..."
echo ""
echo "Depois que o servidor iniciar:"
echo "1. Anote o endereço que aparecer (ex: http://localhost:8080)"
echo "2. No celular conectado à mesma rede Wi-Fi:"
echo "   - Descubra o IP do computador"
echo "   - Abra o Chrome no celular"
echo "   - Acesse: http://SEU_IP:8080"
echo "   - Exemplo: http://192.168.1.100:8080"
echo ""
echo "Para descobrir o IP:"
echo "- Windows: abra cmd e digite 'ipconfig'"
echo "- Mac/Linux: abra terminal e digite 'ifconfig' ou 'ip addr'"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo ""
echo "========================================"
echo ""

# Verifica se o Node.js está instalado
if ! command -v node &> /dev/null
then
    echo "❌ Node.js não está instalado!"
    echo ""
    echo "Por favor, instale o Node.js:"
    echo "https://nodejs.org"
    echo ""
    exit 1
fi

# Inicia o servidor
npx http-server -p 8080 -c-1
