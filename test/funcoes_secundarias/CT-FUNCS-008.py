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
    URL_PAINEL_ADMIN,
    TIMEOUT_MAXIMO,
    DIRETORIO_BASE_SCREENSHOTS,
    CAMPO_EMAIL,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    EMAIL_ADMIN,    
    SENHA_ADMIN,
    EMAIL_GABRIELA, 
    caminho_screenshot
)

# VARIÁVEIS LOCAIS
BOTAO_GERENCIAR_PENALIDADES_TEXTO = "//p[normalize-space()='Gerenciar Penalidades']"
BOTAO_CRIAR_PENALIDADE = "/html[1]/body[1]/div[1]/div[1]/div[1]/main[1]/div[1]/div[1]/button[1]"
DROPDOWN_EQUIPE = "body > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > main:nth-child(2) > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > button:nth-child(2)"
CAMPO_VALOR_PONTOS = "input[value='0']"
CAMPO_MOTIVO = "//textarea"
BOTAO_CONFIRMAR = "//button[@class='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 touch-manipulation active:bg-blue-800 h-10 px-4 py-2 text-sm sm:text-base bg-red-600 hover:bg-red-700 text-white']"
BOTAO_LOGOUT = "//span[@class='hidden sm:inline whitespace-nowrap']"
BOTAO_NOTIFICACOES = "/html[1]/body[1]/div[1]/div[1]/div[1]/nav[1]/div[1]/div[2]/div[1]/button[1]"

# --- DADOS DO TESTE ---
NOME_ARQUIVO_FALHA = "falha_ct_funcs_008.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)
DATA_HORA = datetime.datetime.now().strftime("%H:%M:%S")
MOTIVO_TESTE = f"Penalidade Teste Notif - {DATA_HORA}"
TITULO_NOTIFICACAO = "Sua Equipe Recebeu uma Penalidade" # Apenas

print(f"Iniciando CT-FUNCS-008 (Notificação de Penalidade)...")
try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    navegador = webdriver.Chrome()
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    navegador.maximize_window()

    # ======================================================
    # PARTE 1: ADMIN APLICA PENALIDADE
    # ======================================================
    
    navegador.get(URL_LOGIN)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    
    wait.until(EC.url_contains(URL_PAINEL_ADMIN))
    
    # Acessar Menu
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_GERENCIAR_PENALIDADES_TEXTO))).click()
    time.sleep(2)
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_CRIAR_PENALIDADE))).click()

    # Preencher (Equipe Alfa)
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, DROPDOWN_EQUIPE))).click()
    wait.until(EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'Alfa')] | //span[contains(text(), 'Alfa')]"))).click()

    # Pontos
    time.sleep(2)
    campo_pontos = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, CAMPO_VALOR_PONTOS)))
    campo_pontos.send_keys(Keys.CONTROL + "a")
    campo_pontos.send_keys(Keys.DELETE)
    campo_pontos.send_keys("5")

    campo_motivo = navegador.find_element(By.XPATH, CAMPO_MOTIVO)
    campo_motivo.send_keys(MOTIVO_TESTE)

    # Confirmar
    time.sleep(2)
    navegador.find_element(By.XPATH, BOTAO_CONFIRMAR).click()

     # --- TRATAMENTO DE ALERTA ---
    try:
        # Espera até 5 segundos pelo alerta aparecer
        wait.until(EC.alert_is_present())
        alerta = navegador.switch_to.alert        
        alerta.accept()
        wait.until(EC.alert_is_present())
        alerta = navegador.switch_to.alert        
        alerta.accept()

    except TimeoutException:
        print("Nenhum alerta apareceu")
    print("Penalidade aplicada.")

    # Logout
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_LOGOUT))).click()    
    wait.until(EC.visibility_of_element_located((By.ID, CAMPO_EMAIL)))

    # ======================================================
    # PARTE 2: GABRIELA VERIFICA NOTIFICAÇÃO
    # ======================================================
    
    navegador.get(URL_LOGIN)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_GABRIELA)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    
    time.sleep(4)

    print("Clicando no sino de notificações...")
    try:
        botao_sino = wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_NOTIFICACOES)))
        navegador.execute_script("arguments[0].click();", botao_sino)
        
        time.sleep(2) # Espera lista abrir
        
        # Validação
        src = navegador.page_source
        
        if TITULO_NOTIFICACAO in src:
            print("A notificação de penalidade apareceu!")
        else:
            print("❌ ERRO: A penalidade foi aplicada, mas NÃO gerou notificação no sino.")
            navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)

    except Exception as e:
        print(f"❌ Erro ao verificar notificações: {e}")
        raise e

except Exception as e:
    print(f"\n❌ TESTE FALHOU: {e}")
    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)

finally:
    time.sleep(3)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")