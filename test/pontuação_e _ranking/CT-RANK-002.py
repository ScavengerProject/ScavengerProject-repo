from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os
import sys

# IMPORTA VARIÁVEIS DO CONFIG
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


from config import (
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

     # ENCONTRAR A ÚLTIMA PROVA COM BOTÃO DE TROFÉU (provas concluídas)
    # O botão de troféu tem classes específicas: border-yellow-400 bg-yellow-50 e contém um ícone Trophy
    # Seletor para encontrar todos os botões de troféu (botões dentro de cards de provas concluídas)
    seletor_botoes_trofeu = "//button[contains(@class, 'border-yellow-400') and contains(@class, 'bg-yellow-50')]"
    
    # Aguarda pelo menos um botão de troféu estar presente
    wait.until(EC.presence_of_element_located((By.XPATH, seletor_botoes_trofeu)))
    
    # Encontra todos os botões de troféu
    botoes_trofeu = navegador.find_elements(By.XPATH, seletor_botoes_trofeu)
    
    if not botoes_trofeu:
        raise Exception("Nenhum botão de troféu encontrado. Certifique-se de que há pelo menos uma prova concluída.")
    
    # Pega o último botão (última prova)
    botao_ultima_prova = botoes_trofeu[-1]
    print(f"Encontradas {len(botoes_trofeu)} provas com botão de troféu. Usando a última prova.")

    # FAZER SCROLL ATÉ O ÚLTIMO BOTÃO DE TROFÉU
    navegador.execute_script("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", botao_ultima_prova)
    time.sleep(1)  # Aguarda o scroll suave completar
    
    # Garantir que está visível fazendo scroll adicional se necessário
    navegador.execute_script("window.scrollBy(0, -100);")  # Scroll um pouco para cima para garantir visibilidade
    time.sleep(0.5)
    print("Scroll até a última prova executado.")

    # CLICA NO BOTÃO DO TROFÉU DA ÚLTIMA PROVA PARA DAR A PONTUAÇÃO DE 50 PONTO PARA A EQUIPE BETA
    wait.until(EC.element_to_be_clickable(botao_ultima_prova)).click()
    time.sleep(1)  # Aguarda o modal abrir

    print("Modal de pontuação aberto.")
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
    time.sleep(2)  # Aguarda o ranking carregar

    # VERIFICAÇÃO DA EQUIPE ALFA
    # Encontra o card que contém "Alfa"
    seletor_nome_alfa = "//p[normalize-space()='Alfa']"
    nome_alfa_element = wait.until(EC.visibility_of_element_located((By.XPATH, seletor_nome_alfa)))
    card_alfa = nome_alfa_element.find_element(By.XPATH, "./ancestor::div[contains(@class, 'rounded-lg')]")
    
    # Verifica a posição de Alfa - procura pelo primeiro span que contenha um número
    # A posição está no primeiro span dentro do div flex items-center
    posicao_alfa_element = card_alfa.find_element(By.XPATH, ".//div[contains(@class, 'flex items-center')]//span[1]")
    posicao_alfa = posicao_alfa_element.text.strip()
    
    # Verifica se Alfa tem o troféu (ícone Trophy)
    # O troféu é um SVG com classes text-yellow-600 e shrink-0
    try:
        # Procura por SVG dentro de elemento com text-yellow-600 e shrink-0 (características do troféu)
        trofeu_alfa = card_alfa.find_element(By.XPATH, ".//*[contains(@class, 'text-yellow-600') and contains(@class, 'shrink-0')]//svg")
        tem_trofeu_alfa = True
    except:
        tem_trofeu_alfa = False
    
    print(f"Equipe Alfa - Posição: {posicao_alfa}, Tem troféu: {tem_trofeu_alfa}")

    # VERIFICAÇÃO DA EQUIPE BETA
    # Encontra o card que contém "Beta"
    seletor_nome_beta = "//p[normalize-space()='Beta']"
    nome_beta_element = wait.until(EC.visibility_of_element_located((By.XPATH, seletor_nome_beta)))
    card_beta = nome_beta_element.find_element(By.XPATH, "./ancestor::div[contains(@class, 'rounded-lg')]")
    
    # Verifica a posição de Beta - procura pelo primeiro span que contenha um número
    # A posição está no primeiro span dentro do div flex items-center
    posicao_beta_element = card_beta.find_element(By.XPATH, ".//div[contains(@class, 'flex items-center')]//span[1]")
    posicao_beta = posicao_beta_element.text.strip()
    
    # Verifica se Beta tem o troféu (ícone Trophy)
    # O troféu é um SVG com classes text-yellow-600 e shrink-0
    try:
        # Procura por SVG dentro de elemento com text-yellow-600 e shrink-0 (características do troféu)
        trofeu_beta = card_beta.find_element(By.XPATH, ".//*[contains(@class, 'text-yellow-600') and contains(@class, 'shrink-0')]//svg")
        tem_trofeu_beta = True
    except:
        tem_trofeu_beta = False
    
    print(f"Equipe Beta - Posição: {posicao_beta}, Tem troféu: {tem_trofeu_beta}")

    # VERIFICAÇÃO DO EMPATE
    # Esperado: ambas as equipes devem ter posição "1º" E ter o troféu
    if posicao_alfa == "1º" and posicao_beta == "1º" and tem_trofeu_alfa and tem_trofeu_beta:
        print("C2 (Empate no Ranking): OK — Duas equipes aparecem empatadas em 1º lugar com troféu.")
    else:
        erro_msg = f"C2 (Empate no Ranking): FALHOU — "
        if posicao_alfa != "1º" or posicao_beta != "1º":
            erro_msg += f"Posições: Alfa={posicao_alfa}, Beta={posicao_beta}. "
        if not tem_trofeu_alfa or not tem_trofeu_beta:
            erro_msg += f"Trofeus: Alfa={tem_trofeu_alfa}, Beta={tem_trofeu_beta}."
        raise AssertionError(erro_msg)

    # SUCESSO
    print("\n RESULTADO DO TESTE")
    print("SUCESSO — Verificação de empate concluída com sucesso.")


except Exception as e:
    print("\n RESULTADO DO TESTE")
    print("FALHOU")
    print("Erro:", e)

    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print("Screenshot salvo em:", CAMINHO_COMPLETO_FALHA)

finally:
    time.sleep(2)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")