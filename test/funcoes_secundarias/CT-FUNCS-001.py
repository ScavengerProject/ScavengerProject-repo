from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os
import sys

# IMPORTA VARIÁVEIS DO CONFIG
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, RAIZ)

from test.config import (
    URL_LOGIN,
    URL_PAINEL_ADMIN,
    TIMEOUT_MAXIMO,
    DIRETORIO_BASE_SCREENSHOTS,
    CAMPO_EMAIL,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    EMAIL_ADMIN,    
    SENHA_ADMIN,
    caminho_screenshot
)

# --- CONFIGURAÇÃO DO TESTE ---
NOME_ARQUIVO_FALHA = "falha_rf_18_login_admin.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

print("Iniciando Teste RF 18 (Login do Administrador para Aplicação de Penalidade)...")

try:
    # Cria diretório de screenshots se não existir
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    navegador = webdriver.Chrome()
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    navegador.maximize_window()

    # 1. ACESSAR PÁGINA DE LOGIN
    navegador.get(URL_LOGIN)

    # 2. PREENCHER DADOS DO ADMINISTRADOR
    # Espera o campo email estar presente e insere o email do Admin
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    
    # Insere a senha
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)

    # 3. CLICAR NO BOTÃO DE ENTRAR
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()

    # 4. VALIDAÇÃO DO LOGIN
    wait.until(EC.url_contains(URL_PAINEL_ADMIN))

    print("\n✅ Login de Administrador realizado com sucesso.")
    print(f"URL Atual: {navegador.current_url}")

except Exception as e:
    print("\n RESULTADO DO TESTE")
    print("❌ FALHOU")
    print(f"Erro: {e}")

    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot salvo em: {CAMINHO_COMPLETO_FALHA}")

finally:
    time.sleep(3)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste de login finalizado.")