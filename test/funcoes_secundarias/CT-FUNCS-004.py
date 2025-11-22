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
    EMAIL_GABRIELA,
    SENHA_ADMIN, 
    BOTAO_LOGOUT,
    caminho_screenshot
)

# --- SELETORES ---
BOTAO_ABRIR_MODAL = "//button[@title='Enviar Feedback ou Relatar Problema']"
MENU_MEUS_FEEDBACKS = "//p[normalize-space()='Meus Feedbacks']"
CAMPO_MENSAGEM = "//textarea" 
BOTAO_ENVIAR_MODAL = "//button[contains(., 'Enviar Feedback')]"
BOTAO_MENU_GERENCIAR_FEEDBACKS = "//p[normalize-space()='Gerenciar Feedbacks']" # XPath confirmado por você

# --- DADOS DO TESTE ---
NOME_ARQUIVO_FALHA = "falha_ct_funcs_004.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

DATA_HORA = datetime.datetime.now().strftime("%d/%m %H:%M:%S")
MENSAGEM_TESTE = f"Teste de Feedback Automatizado - {DATA_HORA}"

print("Iniciando CT-FUNCS-004 (Envio de Feedback)...")

try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    navegador = webdriver.Chrome()
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    navegador.maximize_window()

    # 1. LOGIN
    navegador.get(URL_LOGIN)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_GABRIELA)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()

    time.sleep(5)
    
    # 2. ABRIR MODAL
    wait.until(EC.visibility_of_element_located((By.XPATH, BOTAO_ABRIR_MODAL)))
    navegador.find_element(By.XPATH, BOTAO_ABRIR_MODAL).click()
    
    # Espera o textarea aparecer na tela
    campo_texto = wait.until(EC.visibility_of_element_located((By.XPATH, CAMPO_MENSAGEM)))
    time.sleep(1)

    # 3. PREENCHER MENSAGEM
    campo_texto.click()
    campo_texto.send_keys(MENSAGEM_TESTE)

    # 4. ENVIAR
    botao_enviar = navegador.find_element(By.XPATH, BOTAO_ENVIAR_MODAL)
    navegador.execute_script("arguments[0].click();", botao_enviar)
    
    # Espera o modal fechar (o textarea deve sumir)
    time.sleep(2)

    # 5. VALIDAR NA LISTA "MEUS FEEDBACKS"
    wait.until(EC.element_to_be_clickable((By.XPATH, MENU_MEUS_FEEDBACKS))).click()
    time.sleep(3)
    
    src = navegador.page_source
    
    if MENSAGEM_TESTE in src:
        print("O feedback aparece na lista.")
    else:
        print("O feedback não foi encontrado na lista.")
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        raise AssertionError("Feedback não encontrado no histórico.")
    
    # Logout
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_LOGOUT))).click()

    wait.until(EC.visibility_of_element_located((By.ID, CAMPO_EMAIL)))

    # ======================================================
    # PASSO 2: ADMINISTRADOR VISUALIZA
    # ======================================================
    
    # Login Admin
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    
    wait.until(EC.url_contains(URL_PAINEL_ADMIN))
    time.sleep(5)

    # Acessar Gerenciar Feedbacks
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_MENU_GERENCIAR_FEEDBACKS))).click()
    time.sleep(3)

    # VALIDAR SE O FEEDBACK ESTÁ NA LISTA
    print(f"Procurando na lista: '{MENSAGEM_TESTE}'")
    
    # Pega o código fonte da tabela/página atual
    src = navegador.page_source
    
    if MENSAGEM_TESTE in src:
        print(f"O Administrador visualizou o feedback: '{MENSAGEM_TESTE}'")
    else:
        print("O feedback enviado pelo participante não apareceu na lista do Admin.")
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
            
        raise AssertionError("Critério 'Registro de Feedback' falhou: Admin não viu a mensagem.")

except Exception as e:
    print(f"\n❌ FALHOU: {e}")
    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)

finally:
    time.sleep(3)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")