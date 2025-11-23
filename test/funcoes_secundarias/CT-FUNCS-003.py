from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time
import os
import sys

# --- CONFIGURAÇÃO DE CAMINHOS ---
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

# --- VARIÁVEIS LOCAIS ---
BOTAO_GERENCIAR_PENALIDADES_TEXTO = "//p[normalize-space()='Gerenciar Penalidades']"
BOTAO_CRIAR_PENALIDADE = "/html[1]/body[1]/div[1]/div[1]/div[1]/main[1]/div[1]/div[1]/button[1]"
DROPDOWN_EQUIPE = "body > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > main:nth-child(2) > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > button:nth-child(2)"
CAMPO_VALOR_PONTOS = "input[value='0']"

# --- CONFIGURAÇÃO DO TESTE ---
NOME_ARQUIVO_FALHA = "falha_ct_funcs_003.png"

print("Iniciando Teste de UI: Bloqueio de Input Negativo...")

try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    navegador = webdriver.Chrome()
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    navegador.maximize_window()

    # 1. LOGIN
    navegador.get(URL_LOGIN)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    wait.until(EC.url_contains(URL_PAINEL_ADMIN))
    
    # 2. ACESSAR FORMULÁRIO
    print("Acessando formulário...")
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_GERENCIAR_PENALIDADES_TEXTO))).click()
    time.sleep(2)
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_CRIAR_PENALIDADE))).click()

    # 3. SELECIONAR EQUIPE
    print("Selecionando equipe...")
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, DROPDOWN_EQUIPE))).click()
    
    wait.until(EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'Alfa')] | //span[contains(text(), 'Alfa')]"))).click()

    # 4. TENTATIVA DE INSERÇÃO NEGATIVA
    print("Testando input com valor: -50")
    campo_pontos = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, CAMPO_VALOR_PONTOS)))
    
    campo_pontos.send_keys(Keys.CONTROL + "a") 
    campo_pontos.send_keys(Keys.DELETE)        
    
    campo_pontos.send_keys("-50")  
    time.sleep(1)

    # 5. VALIDAÇÃO
    valor_final = campo_pontos.get_attribute("value")
    
    print(f"   Valor digitado: -50")
    print(f"   Valor capturado no campo: '{valor_final}'")

    # Lógica de validação
    if "-" in valor_final:
        print("\nFALHA: O campo aceitou números negativos!")
        navegador.save_screenshot(caminho_screenshot(NOME_ARQUIVO_FALHA))
        raise AssertionError(f"O campo permitiu digitar negativo: {valor_final}")
    else:
        print("\nO campo bloqueou o sinal de negativo.")

except Exception as e:
    print(f"\n❌ Erro durante o teste: {e}")

finally:
    time.sleep(2)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")