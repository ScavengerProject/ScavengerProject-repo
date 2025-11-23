from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException
import time
import os
import sys
import datetime

sys.dont_write_bytecode = True 

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
    EMAIL_GABRIELA, 
    EMAIL_ADMIN,    
    SENHA_ADMIN, 
    BOTAO_LOGOUT,
    caminho_screenshot
)

# VARIÁVEIS LOCAIS
BOTAO_MENU_GERENCIAR_FEEDBACKS = "//p[normalize-space()='Gerenciar Feedbacks']"
BOTAO_RESPONDER = "//div//div//div//div//div//div[1]//div[2]//div[1]//button[1]"
CAMPO_RESPOSTA_ADMIN = "//textarea" 
BOTAO_ENVIAR_RESPOSTA = "//button[contains(., 'Responder e Marcar como Finalizado')]"
MENU_MEUS_FEEDBACKS = "//p[normalize-space()='Meus Feedbacks']"

# --- DADOS DO TESTE ---
NOME_ARQUIVO_FALHA = "falha_ct_funcs_006.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

DATA_HORA = datetime.datetime.now().strftime("%H:%M:%S")
TEXTO_RESPOSTA = f"Resposta do Suporte - {DATA_HORA}"


print("Iniciando CT-FUNCS-006 (Resposta de Feedback)...")

try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    navegador = webdriver.Chrome()
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    navegador.maximize_window()

    # ======================================================
    # PARTE 1: ADMIN RESPONDE O PRIMEIRO FEEDBACK DA LISTA
    # ======================================================
    print("\n--- [1/2] ADMIN RESPONDE ---")
    
    navegador.get(URL_LOGIN)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    
    wait.until(EC.url_contains(URL_PAINEL_ADMIN))
    time.sleep(2)

    # Acessar Menu
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_MENU_GERENCIAR_FEEDBACKS))).click()
    time.sleep(3)

    # Clicar em Responder (No primeiro item da lista)
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_RESPONDER))).click()
   
    # Preencher Resposta
    campo_txt = wait.until(EC.visibility_of_element_located((By.XPATH, CAMPO_RESPOSTA_ADMIN)))
    time.sleep(0.5)
    campo_txt.click()
    campo_txt.send_keys(TEXTO_RESPOSTA)

    # Enviar
    btn_env = navegador.find_element(By.XPATH, BOTAO_ENVIAR_RESPOSTA)
    navegador.execute_script("arguments[0].click();", btn_env)

    time.sleep(2)
    print("Resposta enviada pelo Admin.")

    # Logout
    try:
        wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_LOGOUT))).click()
    except:
        navegador.get(URL_LOGIN)
    
    wait.until(EC.visibility_of_element_located((By.ID, CAMPO_EMAIL)))

    # ======================================================
    # PARTE 2: ALUNO VERIFICA O RECEBIMENTO
    # ======================================================
    
    navegador.get(URL_LOGIN)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_GABRIELA)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    
    time.sleep(3)

    # Ir para Meus Feedbacks
    print("Acessando Meus Feedbacks...")
    wait.until(EC.element_to_be_clickable((By.XPATH, MENU_MEUS_FEEDBACKS))).click()
    
    time.sleep(3) # Espera carregar

    # Validar Texto
    print(f"Procurando resposta: '{TEXTO_RESPOSTA}'")
    src = navegador.page_source

    if TEXTO_RESPOSTA in src:
        print("A resposta do Admin apareceu para o aluno.")
    else:
        print("A resposta não foi encontrada na lista.")
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        raise AssertionError("Resposta do Admin não visível para o aluno.")

except Exception as e:
    print(f"\n❌ FALHOU: {e}")
    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)

finally:
    time.sleep(3)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")