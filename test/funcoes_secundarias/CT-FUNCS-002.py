from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException
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
    GERENCIAR_PENALIDADES_BOTAO,
    caminho_screenshot
)

# VARIÁVEIS LOCAIS
BOTAO_CRIAR_PENALIDADE = "/html[1]/body[1]/div[1]/div[1]/div[1]/main[1]/div[1]/div[1]/button[1]"
CAMPO_VALOR_PONTOS = "input[value='0']"
CAMPO_MOTIVO = "//textarea"
BOTAO_CONFIRMAR = "//button[@class='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 touch-manipulation active:bg-blue-800 h-10 px-4 py-2 text-sm sm:text-base bg-red-600 hover:bg-red-700 text-white']"

# --- CONFIGURAÇÃO DO TESTE ---
NOME_ARQUIVO_FALHA = "falha_ct_funcs_002.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)
MENSAGEM_ESPERADA = "Selecione uma equipe para criar a penalidade."

print("Iniciando Teste Negativo (Tentativa de Penalidade Sem Equipe)...")

# --- INÍCIO DO TESTE ---
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
    
    # 2. CLICAR EM "GERENCIAR PENALIDADES"
    print("Acessando menu de penalidades...")
    wait.until(EC.element_to_be_clickable(
        (By.XPATH, GERENCIAR_PENALIDADES_BOTAO)
    )).click()
    time.sleep(2)
    
    # 3. ABRIR FORMULÁRIO DE PENALIDADE
    print("Abrindo formulário de penalidade...")
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_CRIAR_PENALIDADE))).click()

    # 4. PREENCHER O FORMULÁRIO (PULANDO A SELEÇÃO DE EQUIPE)            
    print("Inserindo motivo...")
    wait.until(EC.element_to_be_clickable((By.XPATH, CAMPO_MOTIVO))).send_keys("Teste Sem Equipe")

    # 5. TENTAR CONFIRMAR
    print("Clicando em confirmar")
    time.sleep(2)
    navegador.find_element(By.XPATH, BOTAO_CONFIRMAR).click()

    # 6. VALIDAR O ALERTA
    print("Aguardando alerta de erro...")
    try:
        wait.until(EC.alert_is_present())
        alerta = navegador.switch_to.alert
        texto_alerta = alerta.text
        alerta.accept()
        
        # COMPARAÇÃO COM A MENSAGEM ESPERADA
        if texto_alerta.strip() == MENSAGEM_ESPERADA:
            print(f"\nO sistema exibiu a mensagem correta: '{MENSAGEM_ESPERADA}'")
            
        else:
            print(f"\n❌ ERRO NA MENSAGEM! Esperava: '{MENSAGEM_ESPERADA}', Recebeu: '{texto_alerta}'")
            raise AssertionError(f"Mensagem de erro incorreta.")

    except TimeoutException:
        print("\n❌ FALHA: Nenhum alerta apareceu.")
        raise AssertionError("O alerta obrigatório não foi exibido.")

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
    print("Teste finalizado.")