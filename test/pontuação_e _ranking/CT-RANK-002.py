from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
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
    TOAST,
    CENTRAL_DE_INFO_BOTAO,
    COMPONENTE_NO_GER_PROVAS,
    caminho_screenshot
)

# ARQUIVO PARA PRINT DE ERRO
NOME_ARQUIVO_FALHA = "falha_ct_rank_002.png"
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
    time.sleep(8) # Para garantir que o toast de login não esteja aparecendo enquanto o de confirmação de atualização de pontuação está aparecendo

    # CLICA NO "GERENCIAR PROVAS" E ENTRA NA PÁGINA
    wait.until(EC.element_to_be_clickable((By.XPATH, GERENCIAR_PROVAS_BOTAO))).click()
    wait.until(EC.url_contains(URL_RESTRITA_ADMIN))
    print("Página acessada com sucesso:", navegador.current_url)
    wait.until(EC.element_to_be_clickable((By.XPATH, COMPONENTE_NO_GER_PROVAS))).click()  # Garante que está na página pro scroll

    # ROLAR ATÉ O FINAL DA PÁGINA
    navegador.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    print("Scroll até o final da página executado.")

    # CLICA NO BOTÃO DO TROFÉU PARA DAR A PONTUAÇÃO DE 50 PONTO PARA A EQUIPE BETA
    wait.until(EC.element_to_be_clickable((By.XPATH, "//div[5]//div[1]//div[1]//div[2]//button[1]"))).click()
    wait.until(EC.element_to_be_clickable((By.ID, "equipe-0"))).click()    # CLICA PARA ESCOLHER A EQUIPE NO MODAL DE PONTUAÇÃO
    opcao = wait.until(EC.element_to_be_clickable((By.XPATH, "//span[text()='Beta']"))).click() # Escolhe a equipe beta
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[normalize-space()='Salvar Resultados'])[1]"))).click()
    print("Pontuação atualizada.")

    # VERIFICAÇÃO DO TOAST DE SUCESSO, estou colocando sempre para esperar pelo elemento dentro do limite (10 segundos)
    toast_element = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, TOAST)))
    mensagem_toast = wait.until(lambda driver: toast_element.text.strip() if toast_element.text.strip() != "" else False) # Pega o texto escrito no toast e compara com o que deve estar escrito
    MENSAGEM_ESPERADA = "Resultados lançados com sucesso!" # Mudar só a mensagem aqui para validar de resto copiar igual.

    print("\nVerificando mensagem do toast...")
    print(f"Toast recebido: '{mensagem_toast}'")

    if MENSAGEM_ESPERADA.lower() in mensagem_toast.lower():
        print(f"C2 (Mensagem do Toast): OK — mensagem exibida: '{mensagem_toast}'")
    else:
        raise AssertionError(
        f"C2 (Mensagem do Toast): FALHOU — esperado '{MENSAGEM_ESPERADA}', recebido '{mensagem_toast}'"
    )

    # VOLTA PARA A CENTRAL PARA VERIFICAR O RANKING
    wait.until(EC.element_to_be_clickable((By.XPATH, CENTRAL_DE_INFO_BOTAO))).click()

    # VERIFICAÇÃO DA EQUIPE ALFA (1º lugar)
    seletor_posicao_alfa = "(//span[@class='font-bold text-lg text-yellow-600'])[1]" ##
    wait.until(EC.visibility_of_element_located((By.XPATH, seletor_posicao_alfa)))
    seletor_nome_alfa = "(//p[@class='font-semibold text-gray-900'][normalize-space()='Alfa'])[1]"  ##
    posicao_alfa = navegador.find_element(By.XPATH, seletor_posicao_alfa).text
    nome_alfa = navegador.find_element(By.XPATH, seletor_nome_alfa).text

    # VERIFICAÇÃO DA EQUIPE BETA (1º lugar)
    seletor_posicao_beta = "(//span[@class='font-bold text-lg text-gray-900'])[1]" ##
    seletor_nome_beta = "(//p[normalize-space()='Beta'])[1]" ##
    posicao_beta = navegador.find_element(By.XPATH, seletor_posicao_beta).text
    nome_beta = navegador.find_element(By.XPATH, seletor_nome_beta).text

    # VERIFICAÇÃO DO EMPATE
    # Esperado: as duas primeiras posições devem ser "1º"
    if posicao_alfa == "1º" and posicao_beta == "1º":
        print("C2 (Empate no Ranking): OK — Duas equipes aparecem empatadas em 1º lugar.")
    else:
        raise AssertionError(
            f"C2 (Empate no Ranking): FALHOU — esperado 2 equipes em 1º lugar, posições encontradas: {posicao_alfa} e {posicao_beta}"
    )

    # SUCESSO
    print("\n RESULTADO DO TESTE")
    print("✅ SUCESSO — Verificação de empate concluída com sucesso.")


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