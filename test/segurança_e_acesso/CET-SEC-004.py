from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import time
import os
import sys

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
    SENHA_ADMIN,
    ACESSAR_EQUIPES_BOTAO,
    COMPONENTE_PAG_ACESSAR_EQUIPES,
    caminho_screenshot
)

# NOME DO ARQUIVO DE PRINT
NOME_ARQUIVO_FALHA = "falha_ct_sec_004.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

print("Iniciando Teste CT-SEC-004 (Acesso Coordenador)...")

try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    navegador = webdriver.Chrome()
    navegador.maximize_window()
    navegador.get(URL_LOGIN)
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)

    # LOGIN COMO COORDENADOR
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_GABRIELA)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()

    print("Login enviado. Aguardando carregamento do painel...")

    # ACESSAR A PÁGINA DE GESTÃO
    botao_equipes = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ACESSAR_EQUIPES_BOTAO)))
    botao_equipes.click()

    # VALIDAR CARREGAMENTO DA PÁGINA
    elemento_validacao = wait.until(EC.visibility_of_element_located((By.XPATH, COMPONENTE_PAG_ACESSAR_EQUIPES)))

    print("Página carregada com sucesso. Elemento encontrado:", elemento_validacao.text)

    # RESULTADO
    print("\n RESULTADO DO TESTE")
    print("✅ SUCESSO (Acesso Coordenador liberado)")
    print("C1 (Elemento da página de coordenador): OK")

except Exception as e:
    print("\n RESULTADO DO TESTE")
    print("❌ FALHOU")
    print("Erro durante a execução:", e)

    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print("Screenshot salvo em:", CAMINHO_COMPLETO_FALHA)

finally:
    time.sleep(3)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")
