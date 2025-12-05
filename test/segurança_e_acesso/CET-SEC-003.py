from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import time
import os
import sys

# IMPORTA AS VARIÁVEIS DO CONFIG
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import (
    URL_LOGIN,
    URL_PAINEL_PARTICIPANTE,
    URL_RESTRITA_ADMIN,
    TIMEOUT_MAXIMO,
    DIRETORIO_BASE_SCREENSHOTS,
    CAMPO_EMAIL,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    EMAIL_GABRIELA,
    SENHA_ADMIN,
    TOAST,
    caminho_screenshot
)

# CONFIGURAÇÃO DO ARQUIVO DE PRINT DE FALHA
NOME_ARQUIVO_FALHA = "falha_ct_sec_003.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

# INICIANDO O TESTE CT-SEC-002
print("Iniciando Teste CT-SEC-003 (Acesso Negado - Participante)...")

try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    # Navegador
    navegador = webdriver.Chrome()
    navegador.maximize_window()
    navegador.get(URL_LOGIN)
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)

    # LOGIN COMO PARTICIPANTE (GABRIELA)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_GABRIELA)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    time.sleep(2)

    # Espera o login ser concluído (redirecionamento para o painel de Participante)
    wait.until(EC.url_contains(URL_PAINEL_PARTICIPANTE))
    print(f"Login de Participante realizado. URL atual: {navegador.current_url}")
    time.sleep(1)

    # TENTATIVA DE ACESSO DIRETO À ÁREA RESTRITA DO ADMIN
    print(f"Tentando acessar página restrita: {URL_RESTRITA_ADMIN}")
    navegador.get(URL_RESTRITA_ADMIN)

    # VERIFICAÇÃO DA MENSAGEM DE ERRO (TOAST)
    toast_element = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, TOAST)))
    mensagem_toast = wait.until(
        lambda driver: toast_element.text.strip() if toast_element.text.strip() != "" else False
    )

    MENSAGEM_ESPERADA = "Acesso negado"

    print("\nVerificando mensagem de bloqueio...")
    print(f"Toast recebido: '{mensagem_toast}'")

    if MENSAGEM_ESPERADA.lower() not in mensagem_toast.lower():
        raise AssertionError(
            f"C2 (Mensagem do Toast): FALHOU — esperado '{MENSAGEM_ESPERADA}', recebido '{mensagem_toast}'"
        )

    # VERIFICAÇÃO DO BLOQUEIO POR URL
    url_final = navegador.current_url
    if URL_RESTRITA_ADMIN in url_final:
        raise AssertionError(
            f"C1 (Bloqueio por URL): FALHOU — usuário permaneceu na URL restrita: {url_final}"
        )

    # RESULTADOS
    print("\n RESULTADO DO TESTE")
    print(" SUCESSO (Bloqueio de acesso funcionando)")
    print(f"C1 (URL): Redirecionado corretamente (OK)")
    print(f"C2 (Toast): Mensagem exibida e correta (OK)")

except Exception as e:
    print("\n RESULTADO DO TESTE")
    print(" FALHOU")
    print(f"Erro durante a execução do teste: {e}")

    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot salvo em: {CAMINHO_COMPLETO_FALHA}")

finally:
    time.sleep(3)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")