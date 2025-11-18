from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os

# IMPORTA AS VARIÁVEIS DO CONFIG
import sys
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, RAIZ)
from test.config import (
    URL_LOGIN,
    URL_PAINEL_ADMIN,
    TIMEOUT_MAXIMO,
    TEMPO_LIMITE_RESPOSTA,
    DIRETORIO_BASE_SCREENSHOTS,
    EMAIL_ADMIN,
    SENHA_ADMIN,
    CAMPO_EMAIL,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    TOAST,
    caminho_screenshot
)

NOME_ARQUIVO_FALHA = "falha_ct_sec_001.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

print("Iniciando Teste CT-SEC-001...")

try:
    # Garante que o caminho que os screenshots estão sendo direcionados exista
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    # Configura o navegador como o Chrome
    navegador = webdriver.Chrome()
    navegador.maximize_window()
    print(f"Acessando URL Login: {URL_LOGIN}")

    # Inicia a contagem de tempo para medir o tempo de resposta
    start_time = time.time()

    # LOGIN
    # Usando espera explícita para garantir que os elementos estejam carregados pra começar
    navegador.get(URL_LOGIN)
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)

    # Localizar e preencher e-mail, senha e clicar no botão entrar
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    print("Credenciais enviadas")

    # VERIFICAÇÕES (CRITÉRIOS DE ACEITAÇÃO)
    
    # PRIMEIRO: VERIFICAÇÃO DE REDIRECIONAMENTO (Painel do Administrador), aconteceu de ser a mesma do login...
    wait.until(EC.url_contains(URL_PAINEL_ADMIN))

    # Mede o Tempo de Resposta Total (do clique no 'Entrar' até o redirecionamento)
    end_time = time.time()
    tempo_resposta = end_time - start_time

    # SEGUNDO: VERIFICAÇÃO DO TOAST DE SUCESSO, estou colocando sempre para esperar pelo elemento dentro do limite (10 segundos)
    toast_element = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, TOAST)))
    mensagem_toast = wait.until(lambda driver: toast_element.text.strip() if toast_element.text.strip() != "" else False) # Pega o texto escrito no toast e compara com o que deve estar escrito
    MENSAGEM_ESPERADA = "Login realizado com sucesso!" # Mudar só a mensagem aqui para validar de resto copiar igual.

    print("\nVerificando mensagem do toast...")
    print(f"Toast recebido: '{mensagem_toast}'")

    if MENSAGEM_ESPERADA.lower() in mensagem_toast.lower():
        print(f"C2 (Mensagem do Toast): OK — mensagem exibida: '{mensagem_toast}'")
    else:
        raise AssertionError(
        f"C2 (Mensagem do Toast): FALHOU — esperado '{MENSAGEM_ESPERADA}', recebido '{mensagem_toast}'"
    )

    # RESULTADOS
    print("\n RESULTADO DO TESTE")

    # Confirmação do Redirecionamento e Toast
    print("✅ SUCESSO")
    print(f"C1 - (Redirecionamento) URL atual: {navegador.current_url}")
    print(f"C2 - Toast Sucesso: toast visível e com a mensagem correta (OK)")

    # VERIFICAÇÃO DO TEMPO DE RESPOSTA (Critério RNF 3)
    print(f"C3 - Tempo de resposta: {tempo_resposta:.2f}s")
    if tempo_resposta <= TEMPO_LIMITE_RESPOSTA:
        print("C3 - (Tempo ≤ limite): APROVADO")
    else:
        print("C3 - (Tempo ≤ limite): FALHOU — tempo excedido")


except Exception as e:
    print("\n RESULTADO DO TESTE")
    print("\n❌ FALHOU")
    print(f"Erro durante a execução do teste: {e}")

    # Salva um print com o erro (se dermos sorte)
    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot salvo em: {CAMINHO_COMPLETO_FALHA}")

finally:
    # Do o tempo para a tela ficar aberta e depois fechar
    time.sleep(3)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")
