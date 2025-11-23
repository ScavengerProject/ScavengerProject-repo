from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException
import time
import os
import sys

# IMPORTA CONFIG
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
    GERENCIAR_PENALIDADES_BOTAO,
    caminho_screenshot
)

# VARIÁVEIS LOCAIS
BOTAO_CRIAR_PENALIDADE = "/html[1]/body[1]/div[1]/div[1]/div[1]/main[1]/div[1]/div[1]/button[1]"
DROPDOWN_EQUIPE = "body > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > main:nth-child(2) > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > button:nth-child(2)"
CAMPO_VALOR_PONTOS = "input[value='0']"
BOTAO_CONFIRMAR = "//button[@class='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 touch-manipulation active:bg-blue-800 h-10 px-4 py-2 text-sm sm:text-base bg-red-600 hover:bg-red-700 text-white']"

# --- DADOS DO TESTE ---
NOME_ARQUIVO_FALHA = "falha_ct_funcs_004.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

print(f"Iniciando CT-FUNCS-004 (Validação: Motivo Obrigatório)...")

try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    navegador = webdriver.Chrome()
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    navegador.maximize_window()

    # 1. LOGIN ADMIN
    navegador.get(URL_LOGIN)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    wait.until(EC.url_contains(URL_PAINEL_ADMIN))
    
    # 2. ABRIR FORMULÁRIO
    print("Acessando formulário...")
    wait.until(EC.element_to_be_clickable((By.XPATH, GERENCIAR_PENALIDADES_BOTAO))).click()
    time.sleep(2)
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_CRIAR_PENALIDADE))).click()

    # 3. PREENCHER PARCIALMENTE
    print("Preenchendo formulário...")
    
    # Selecionar Equipe
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, DROPDOWN_EQUIPE))).click()
    wait.until(EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'Alfa')] | //span[contains(text(), 'Alfa')]"))).click()


    # Inserir Pontos
    time.sleep(3)
    campo_pontos = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, CAMPO_VALOR_PONTOS)))
    campo_pontos.send_keys(Keys.CONTROL + "a")
    campo_pontos.send_keys(Keys.DELETE)
    campo_pontos.send_keys("10")

    # 4. TENTAR CONFIRMAR
    time.sleep(2)
    navegador.find_element(By.XPATH, BOTAO_CONFIRMAR).click()

    # 5. VALIDAR ALERTA DE BLOQUEIO
    print("Aguardando alerta do sistema...")
    try:
        wait.until(EC.alert_is_present())
        alerta = navegador.switch_to.alert
        texto_alerta = alerta.text.lower()
        
        alerta.accept() # Fecha o alerta
        
        # Palavras-chave esperadas num erro desse tipo
        palavras_chave = ["motivo", "obrigatório", "preencha", "erro", "inválido"]
        
        # Verifica se alguma palavra chave está no texto do alerta
        if any(palavra in texto_alerta for palavra in palavras_chave):
            print("\n O sistema bloqueou o envio e pediu o motivo.")
        
        elif "sucesso" in texto_alerta:
            print("\n❌ FALHA: O sistema aceitou a penalidade sem motivo")

    except TimeoutException:
        print("\n❌ FALHA: Nenhum alerta apareceu.")

except Exception as e:
    print(f"\n❌ TESTE FALHOU: {e}")
    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)

finally:
    time.sleep(3)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")