from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
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
    EMAIL_GABRIELA,
    CENTRAL_DE_INFO_BOTAO,
    COMPONENTE_NO_GER_PROVAS,
    caminho_screenshot
)

# ARQUIVO PARA PRINT DE ERRO
NOME_ARQUIVO_FALHA = "falha_ct_rank_006.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

print("Iniciando Teste CT-RANK-006 (Consistência do Ranking)...")

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
    posicao_beta = navegador.find_element(By.XPATH, "(//span[@class='font-bold text-lg text-yellow-600'])[1]").text ##
    nome_beta = navegador.find_element(By.XPATH, "(//p[@class='font-semibold text-gray-900'][normalize-space()='Beta'])[1]").text ##
    pontos_beta = navegador.find_element(By.XPATH, "(//p[normalize-space()='110 pontos'])[1]").text ##
    print("\nEquipe Beta:" f"- Posição: {posicao_beta}" f"- Nome: {nome_beta}" f"- Pontos: {pontos_beta}")

    # VERIFICAÇÃO DA EQUIPE ALFA
    posicao_alfa = navegador.find_element(By.XPATH, "(//span[@class='font-bold text-lg text-gray-900'])[1]").text ##
    nome_alfa = navegador.find_element(By.XPATH, "(//p[normalize-space()='Alfa'])[1]").text ##
    pontos_alfa = navegador.find_element(By.XPATH, "(//p[normalize-space()='100 pontos'])[1]").text ##
    print("\nEquipe Alfa:" f"- Posição: {posicao_alfa}" f"- Nome: {nome_alfa}" f"- Pontos: {pontos_alfa}")

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

    # ESCOLHE A EQUIPE BETA
    wait.until(EC.element_to_be_clickable((By.ID, "equipe-0"))).click()    # CLICA PARA ESCOLHER A EQUIPE NO MODAL DE PONTUAÇÃO
    opcao = wait.until(EC.element_to_be_clickable((By.XPATH, "//span[text()='Beta']"))).click() # Escolhe a equipe beta
    # ESCOLHE A EQUIPE ALFA 
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[normalize-space()='Adicionar Posição'])[1]"))).click()   # CLICA PRA ADICIONAR O SEGUNDO LUGAR
    wait.until(EC.element_to_be_clickable((By.ID, "equipe-1"))).click()    # CLICA PARA ESCOLHER A EQUIPE NO MODAL DE PONTUAÇÃO
    opcao = wait.until(EC.element_to_be_clickable((By.XPATH, "//span[text()='Alfa']"))).click() # Escolhe a equipe beta
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

    # VOLTA PARA A CENTRAL PARA VERIFICAR O RANKING
    wait.until(EC.element_to_be_clickable((By.XPATH, CENTRAL_DE_INFO_BOTAO))).click()

    # FAZENDO UMA VERIFICAÇÃO DEPOIS DO RANKING
    # VERIFICAÇÃO DA EQUIPE BETA
    time.sleep(2)
    posicao_beta = navegador.find_element(By.XPATH, "(//span[@class='font-bold text-lg text-yellow-600'])[1]").text ##
    nome_beta = navegador.find_element(By.XPATH, "(//p[@class='font-semibold text-gray-900'][normalize-space()='Beta'])[1]").text ##
    pontos_beta = navegador.find_element(By.XPATH, "(//p[normalize-space()='120 pontos'])[1]").text ##
    #print("\nEquipe Beta:" f"- Posição: {posicao_beta}" f"- Nome: {nome_beta}" f"- Pontos: {pontos_beta}")

    # VERIFICAÇÃO DA EQUIPE ALFA
    posicao_alfa = navegador.find_element(By.XPATH, "(//span[@class='font-bold text-lg text-gray-900'])[1]").text ##
    nome_alfa = navegador.find_element(By.XPATH, "(//p[normalize-space()='Alfa'])[1]").text ##
    pontos_alfa = navegador.find_element(By.XPATH, "(//p[normalize-space()='110 pontos'])[1]").text ##
    #print("\nEquipe Alfa:" f"- Posição: {posicao_alfa}" f"- Nome: {nome_alfa}" f"- Pontos: {pontos_alfa}")

    # --- VERIFICAÇÃO FINAL DE CONSISTÊNCIA DO RANKING ---
    print("\n C1 - Verificando consistência final do ranking...")

    # VERIFICAÇÕES DA EQUIPE BETA
    if posicao_beta != "1º":
        raise AssertionError(f"❌ ERRO RANKING: Beta deveria estar em 1º, mas está em '{posicao_beta}'.")

    if pontos_beta != "120 pontos":
        raise AssertionError(f"❌ ERRO RANKING: Beta deveria ter 120 pontos, mas está com '{pontos_beta}'.")

    # VERIFICAÇÕES DA EQUIPE ALFA
    if posicao_alfa != "2º":
        raise AssertionError(f"❌ ERRO RANKING: Alfa deveria estar em 2º, mas está em '{posicao_alfa}'.")

    if pontos_alfa != "110 pontos":
        raise AssertionError(f"❌ ERRO RANKING: Alfa deveria ter 110 pontos, mas está com '{pontos_alfa}'.")

    print("✅ C1 - Ranking consistente após atualização de pontos.")

    # SAIR E ENTRAR COMO ALUNO  
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[@class='justify-center whitespace-nowrap text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-semibold shadow-md hover:shadow-lg'])[1]"))).click()

    # LOGIN GABRIELA (Equipe Alfa)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_GABRIELA)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()

    # CLICA EM VER TODAS AS PROVAS
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[normalize-space()='Ver todas as provas disponíveis'])[1]"))).click()

    # CLICA NA PROVA DE TESTE 6 PARA VER O RANKING
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//p[@class='text-xs text-gray-500 mt-2'][normalize-space()='Prova Prática'])[1]"))).click() ##

    # VERIFICA SE O CAMPO DE PONTUAÇÃO ESTÁ APARECENDO COM 10 PONTOS PARA A SUA EQUIPE
    try:
        # tenta encontrar o texto "10 pontos" e se aparece, o wait termina e da o erro
        wait.until(EC.presence_of_element_located((By.XPATH,"(//span[contains(normalize-space(.), '10 pontos')])[1]"))) ##
        print("✅ C1 - Pontuação aparece correta para a equipe.")
    except TimeoutException:
        raise AssertionError("❌ C1 - Pontuação não aparece correta para a equipe.")

    # SUCESSO
    print("\n RESULTADO DO TESTE")
    print("✅ SUCESSO — Verificação de Consistência do Ranking concluída com sucesso.")

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