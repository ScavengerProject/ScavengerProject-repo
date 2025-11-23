from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoAlertPresentException
from selenium.webdriver.common.keys import Keys
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
    GERENCIAR_PENALIDADES_BOTAO,
    CENTRAL_DE_INFO_BOTAO,
    COMPONENTE_NO_GER_PROVAS,
    caminho_screenshot
)

# ARQUIVO PARA PRINT DE ERRO
NOME_ARQUIVO_FALHA = "falha_ct_rank_007.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

print("Iniciando Teste CT-RANK-007 (Confiabilidade)...")

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
    time.sleep(3)

    # FAZENDO UMA VERIFICAÇÃO ANTES DO RANKING
    # VERIFICAÇÃO DA EQUIPE BETA
    posicao_beta = navegador.find_element(By.XPATH, "(//span[@class='font-bold text-lg text-yellow-600'])[1]").text 
    nome_beta = navegador.find_element(By.XPATH, "(//p[@class='font-semibold text-gray-900'][normalize-space()='Beta'])[1]").text
    pontos_beta = navegador.find_element(By.XPATH, "(//p[normalize-space()='110 pontos'])[1]").text ## OS PONTOS
    print("\nEquipe Beta:" f"- Posição: {posicao_beta}" f"- Nome: {nome_beta}" f"- Pontos: {pontos_beta}")

    # CLICA NO "GERENCIAR PROVAS" E ENTRA NA PÁGINA
    wait.until(EC.element_to_be_clickable((By.XPATH, GERENCIAR_PROVAS_BOTAO))).click()
    wait.until(EC.url_contains(URL_RESTRITA_ADMIN))
    print("\nPágina acessada com sucesso:", navegador.current_url)
    wait.until(EC.element_to_be_clickable((By.XPATH, COMPONENTE_NO_GER_PROVAS))).click()  # Garante que está na página pro scroll

    # ROLAR ATÉ O FINAL DA PÁGINA
    navegador.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    print("\nScroll até o final da página executado.")

    # CLICA NO BOTÃO DO TROFÉU PARA DAR A PONTUAÇÃO PARA AS EQUIPES
    wait.until(EC.element_to_be_clickable((By.XPATH, "//div[4]//div[1]//div[1]//div[2]//button[1]"))).click()

    # ESCOLHE A EQUIPE BETA E VAI ADICIONAR 10 PONTOS (FICANDO 120 PONTOS)
    wait.until(EC.element_to_be_clickable((By.ID, "equipe-0"))).click()    # CLICA PARA ESCOLHER A EQUIPE NO MODAL DE PONTUAÇÃO
    opcao = wait.until(EC.element_to_be_clickable((By.XPATH, "//span[text()='Beta']"))).click() # Escolhe a equipe beta
    # SALVA
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[normalize-space()='Salvar Resultados'])[1]"))).click()
    print("\nPontuação atualizada.")

    inicio = time.time()   # marca o tempo após salvar
    try:
        # Aguarda até 3 segundos o ranking ficar disponível
        wait_3s = WebDriverWait(navegador, 3)
        wait_3s.until(EC.element_to_be_clickable((By.XPATH, CENTRAL_DE_INFO_BOTAO)))

        fim = time.time()
        tempo_total = fim - inicio

        print("\n Ranking atualizado e disponível em {tempo_total:.2f} segundos.")

        if tempo_total > 3:raise AssertionError(f"❌ ERRO DE PERFORMANCE: Ranking demorou mais de 3s para atualizar ({tempo_total:.2f}s).")

        print("✅ C2 - Tempo dentro do limite (≤ 3s).")

    except TimeoutException:
        raise AssertionError("❌ C2 - ERRO: Ranking NÃO ficou disponível dentro de 3 segundos.")
    
    # CRIAR PUNIÇÃO PARA DIMINUIR OS PONTOS
    # ENTRO EM GERENCIAR PENALIDADES
    time.sleep(2)
    wait.until(EC.element_to_be_clickable((By.XPATH, GERENCIAR_PENALIDADES_BOTAO))).click()

    # CRIAR UMA PENALIDADE 
    time.sleep(2)
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[normalize-space()='Criar Penalidade'])[1]"))).click()
    # PREENCHENDO A PENALIDADE
    wait.until(EC.element_to_be_clickable((By.XPATH, "//button[.//span[normalize-space()='Selecione a equipe']]"))).click()    # CLICA PARA ESCOLHER A EQUIPE NO MODAL
    wait.until(EC.element_to_be_clickable((By.XPATH, "//span[text()='Beta']"))).click() # Escolhe a equipe beta
    time.sleep(3)
    valor = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@type='number']")))
    valor.click()
    valor.clear()
    valor.send_keys(Keys.CONTROL + "a")
    valor.send_keys(Keys.DELETE)
    valor.send_keys("10")
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[normalize-space()='Confirmar Penalidade'])[1]"))).click() 
    time.sleep(8)
    print("\n Penalidade criada com sucesso!")

    # VOLTA PARA A CENTRAL PARA VERIFICAR O RANKING
    wait.until(EC.element_to_be_clickable((By.XPATH, CENTRAL_DE_INFO_BOTAO))).click()

    # FAZENDO UMA VERIFICAÇÃO DEPOIS DO RANKING
    # VERIFICAÇÃO DA EQUIPE BETA
    time.sleep(3)
    posicao_beta = navegador.find_element(By.XPATH, "(//span[@class='font-bold text-lg text-yellow-600'])[1]").text
    nome_beta = navegador.find_element(By.XPATH, "(//p[@class='font-semibold text-gray-900'][normalize-space()='Beta'])[1]").text
    pontos_beta = navegador.find_element(By.XPATH, "(//p[normalize-space()='110 pontos'])[1]").text ##

    # --- VERIFICAÇÃO FINAL DE CONSISTÊNCIA DO RANKING ---
    print("\n C1 - Verificando consistência final do ranking...")
    # VERIFICAÇÕES DA EQUIPE BETA
    if posicao_beta != "1º":
        raise AssertionError(f"❌ ERRO RANKING: Beta deveria estar em 1º, mas está em '{posicao_beta}'.")

    if pontos_beta != "110 pontos":
        raise AssertionError(f"❌ ERRO RANKING: Beta deveria ter 110 pontos, mas está com '{pontos_beta}'.")

    print("✅ Ranking consistente após atualização de pontos.")

    # SUCESSO
    print("\n RESULTADO DO TESTE")
    print("✅ SUCESSO — Verificação de Confiabilidade concluída com sucesso.")

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

