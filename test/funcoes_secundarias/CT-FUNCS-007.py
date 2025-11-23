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

# IMPORTA CONFIG
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, RAIZ)

from test.config import (
    URL_LOGIN,
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
BOTAO_ABRIR_MODAL = "//button[@title='Enviar Feedback ou Relatar Problema']"
CAMPO_MENSAGEM = "//textarea" 
BOTAO_ENVIAR_MODAL = "//button[contains(., 'Enviar Feedback')]"
BOTAO_NOTIFICACOES_ADMIN = "/html[1]/body[1]/div[1]/div[1]/div[1]/nav[1]/div[1]/div[2]/div[1]/button[1]"

TITULO_NOTIFICACAO = "Novo Feedback Recebido"
CORPO_NOTIFICACAO = "enviou um novo feedback"

# --- DADOS DO TESTE ---
NOME_ARQUIVO_FALHA = "falha_ct_funcs_007.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)
DATA_HORA = datetime.datetime.now().strftime("%H:%M")
MENSAGEM_FEEDBACK = f"Teste de Notificação Admin {DATA_HORA}"

print(f"Iniciando CT-FUNCS-007 (Admin Recebe Notificação de novo feedback)...")

try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    navegador = webdriver.Chrome()
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    navegador.maximize_window()

    # ======================================================
    # PARTE 1: PARTICIPANTE ENVIA FEEDBACK
    # ======================================================
    navegador.get(URL_LOGIN)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_GABRIELA)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    
    # Espera botão de feedback
    wait.until(EC.visibility_of_element_located((By.XPATH, BOTAO_ABRIR_MODAL)))
    time.sleep(2) 

    # Abre Modal e Envia
    btn_modal = navegador.find_element(By.XPATH, BOTAO_ABRIR_MODAL)
    navegador.execute_script("arguments[0].click();", btn_modal)
    
    campo = wait.until(EC.visibility_of_element_located((By.XPATH, CAMPO_MENSAGEM)))
    time.sleep(2)
    campo.send_keys(MENSAGEM_FEEDBACK)

    btn_env = navegador.find_element(By.XPATH, BOTAO_ENVIAR_MODAL)
    navegador.execute_script("arguments[0].click();", btn_env)
    
    time.sleep(2) # Garante que o envio foi processado

    # Logout
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_LOGOUT))).click()

    wait.until(EC.visibility_of_element_located((By.ID, CAMPO_EMAIL)))

    # ======================================================
    # PARTE 2: ADMIN VERIFICA NOTIFICAÇÃO
    # ======================================================
    
    # Login Admin
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    
    # Aguarda carregar dashboard
    time.sleep(3) 

    try:
        wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_NOTIFICACOES_ADMIN))).click()        
        time.sleep(2)
        
        src = navegador.page_source
        
        # Verifica se o título "Novo Feedback Recebido" está visível
        if TITULO_NOTIFICACAO in src:
            print(f"Título '{TITULO_NOTIFICACAO}' encontrado.")
            
            if CORPO_NOTIFICACAO in src:
                 print(f"Detalhe confirmado: '{CORPO_NOTIFICACAO}' encontrado.")
            else:
                 print("O título está lá, mas o corpo da mensagem parece diferente.")
                 
        else:
            print(f"ERRO: Notificação '{TITULO_NOTIFICACAO}' não encontrada.")
            navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
            raise AssertionError("Admin não recebeu notificação do novo feedback.")

    except Exception as e:
        print(f"❌ Erro ao interagir com notificações: {e}")
        raise e

except Exception as e:
    print(f"\n❌ FALHOU: {e}")
    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)

finally:
    time.sleep(3)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")