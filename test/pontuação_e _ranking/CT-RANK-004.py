from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support import expected_conditions as EC
import time
import os
import sys

# IMPORTA VARIÁVEIS DO CONFIG
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, RAIZ)

from test.config import (
    URL_LOGIN,
    TIMEOUT_MAXIMO,
    DIRETORIO_BASE_SCREENSHOTS,
    CAMPO_EMAIL,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    EMAIL_ADMIN,
    SENHA_ADMIN,
    GERENCIAR_PROVAS_BOTAO,
    URL_RESTRITA_ADMIN,
    CENTRAL_DE_INFO_BOTAO,
    COMPONENTE_NO_GER_PROVAS,
    caminho_screenshot
)

# ARQUIVO PARA PRINT DE ERRO
NOME_ARQUIVO_FALHA = "falha_ct_rank_004.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

print("Iniciando Teste CT-RANK-002 (Verificação do placar empatado)...")

try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    navegador = webdriver.Chrome()
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    navegador.maximize_window()
    navegador.get(URL_LOGIN)

    # LOGIN ADMINISTRADOR
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    print("Login realizado com sucesso como Administrador.")

    # CLICA NO "GERENCIAR PROVAS" E ENTRA NA PÁGINA
    wait.until(EC.element_to_be_clickable((By.XPATH, GERENCIAR_PROVAS_BOTAO))).click()
    wait.until(EC.url_contains(URL_RESTRITA_ADMIN))
    print("Página acessada com sucesso:", navegador.current_url)
    wait.until(EC.element_to_be_clickable((By.XPATH, COMPONENTE_NO_GER_PROVAS))).click()  # Garante que está na página pro scroll

    # ROLAR ATÉ O FINAL DA PÁGINA
    navegador.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    print("Scroll até o final da página executado.")

    # CLICA NO BOTÃO DE EDITAR A PROVA DE TESTE PARA COLOCAR OS VALORES DOS QUESITOS DE PONTUAÇÃO
    wait.until(EC.element_to_be_clickable((By.XPATH, "//div[4]//div[1]//div[1]//div[2]//button[2]"))).click()

    # DESÇO A TELA 
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//div[@class='flex flex-col space-y-1.5 p-6'])[5]"))).click()

    # TENTO ACHAR ONDE ADICIONAR OS PONTOS PARA CADA QUESITO
    try:
        wait.until(EC.presence_of_element_located((By.XPATH,"(//input[@id='tempo'])[1]")))
        print("✅ OK: Existe pelo menos um campo para adicionar o valor de cada quesito de pontuação.")
    except TimeoutException:
        # NÃO EXISTE ENTÃO FECHO O TESTE COM ESSE ERRO
        raise AssertionError("❌ ERRO: Não existe um campo para adicionar o valor de cada quesito de pontuação.")

    # SUCESSO
    print("\n RESULTADO DO TESTE")
    print("✅ SUCESSO — Pontuação com Múltiplos Quesitos verificada. ")

except Exception as e:
    print("\n RESULTADO DO TESTE")
    print("❌ FALHOU")
    print("Erro:", e)

    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print("Screenshot salvo em:", CAMINHO_COMPLETO_FALHA)

finally:
    time.sleep(2)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")