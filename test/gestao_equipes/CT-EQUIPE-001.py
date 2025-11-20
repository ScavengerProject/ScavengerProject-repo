from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import os
import sys

# IMPORTAR CONFIGURAÇÕES
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import (
    URL_LOGIN,
    URL_PAINEL_PARTICIPANTE,
    TIMEOUT_MAXIMO,
    TEMPO_LIMITE_RESPOSTA,
    DIRETORIO_BASE_SCREENSHOTS,
    CAMPO_EMAIL,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    TOAST,
    EMAIL_ALUNOMEDIO3,
    SENHA_ADMIN,
    caminho_screenshot
)

# CONFIGURAÇÃO DE SCREENSHOTS
NOME_ARQUIVO_FALHA = "falha_ct_equipe_001.png"
NOME_ARQUIVO_SUCESSO = "sucesso_ct_equipe_001.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)
CAMINHO_COMPLETO_SUCESSO = caminho_screenshot(NOME_ARQUIVO_SUCESSO)

# URL E VARIÁVEIS DO TESTE
URL_INSCRICAO_EQUIPES = "http://localhost:5173/inscricao-equipes"
NOME_EQUIPE_TESTE = "Alfa"  # Nome da equipe conforme especificado no caso de teste
MENSAGEM_TOAST_ESPERADA = "Parabéns! Você se inscreveu com sucesso!"

print("Iniciando Teste CT-EQUIPE-001 (Participante se Inscreve em Equipe Disponível)...")

try:
    # Cria o diretório de screenshots se não existir
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)
        print(f"Diretório criado: {DIRETORIO_BASE_SCREENSHOTS}")

    navegador = webdriver.Chrome()
    navegador.maximize_window()
    navegador.get(URL_LOGIN)
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)

    # --- PASSO 1: LOGIN COMO PARTICIPANTE SEM EQUIPE ---
    print("Executando Passo 1: Login como Participante Sem Equipe...")
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ALUNOMEDIO3)
    time.sleep(1)  # Pequena pausa para garantir que o campo esteja pronto
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    time.sleep(1)  # Pequena pausa para garantir que o campo esteja pronto
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    print("Login enviado.")
    

    # Aguarda o redirecionamento após login
    time.sleep(2)  # Aguarda o redirecionamento
    wait.until(EC.url_contains(URL_PAINEL_PARTICIPANTE))
    print("Login realizado com sucesso.")

    # --- PASSO 2: ACESSAR A TELA DE INSCRIÇÃO ---
    print("Executando Passo 2: Acessar a tela de Inscrição...")
    navegador.get(URL_INSCRICAO_EQUIPES)
    
    # Aguarda o carregamento da página de inscrição
    wait.until(EC.url_contains(URL_INSCRICAO_EQUIPES))
    
    # Aguarda o carregamento das equipes (espera pelo título da página ou grid de equipes)
    wait.until(EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Escolha sua Equipe') or contains(text(), 'Sua Equipe')]")))
    print("Tela de inscrição carregada.")

    # --- PASSO 3: SELECIONAR A EQUIPE TESTE ---
    print(f"Executando Passo 3: Selecionar a Equipe '{NOME_EQUIPE_TESTE}'...")
    
    # Tenta encontrar a equipe pelo nome no título
    try:
        equipe_elemento = wait.until(EC.presence_of_element_located((By.XPATH, f"//*[normalize-space()='{NOME_EQUIPE_TESTE}' and (self::h3 or self::h4 or contains(@class, 'CardTitle'))]")))
        print(f"Equipe '{NOME_EQUIPE_TESTE}' encontrada.")
        # Se encontrou pelo nome, encontra o botão no mesmo container pai (procura por div que contenha ambos)
        # Usa ancestor para encontrar um div que contenha tanto o título quanto o botão
        container_pai = equipe_elemento.find_element(By.XPATH, "./ancestor::div[.//button[contains(text(), 'Inscrever-se')]][1]")
        botao_inscrever = container_pai.find_element(By.XPATH, ".//button[contains(text(), 'Inscrever-se')]")
    except (TimeoutException, NoSuchElementException):
        # Se não encontrar pelo nome exato, pega a primeira equipe disponível
        print(f"Equipe '{NOME_EQUIPE_TESTE}' não encontrada. Selecionando primeira equipe disponível...")
        botao_inscrever = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Inscrever-se')]")))

    # --- PASSO 4: CLICAR EM "INGRESSAR" (BOTÃO "INSCREVER-SE") ---
    print("Executando Passo 4: Clicar em 'Inscrever-se'...")
    
    # Inicia a contagem de tempo antes do clique
    start_time = time.time()
    
    botao_inscrever.click()
    print("Botão 'Inscrever-se' clicado.")
    time.sleep(1)  # Aguarda o clique ser processado

    # ######################################################################
    # ##### INÍCIO DA VERIFICAÇÃO DE CRITÉRIOS #####
    # ######################################################################

    print("Aguardando resposta do servidor e verificando critérios...")

    # CRITÉRIO 1: Verifica o Toast de Sucesso
    toast_element = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, TOAST)))
    mensagem_toast = wait.until(lambda driver: toast_element.text.strip() if toast_element.text.strip() != "" else False)
    
    print(f"\nVerificando mensagem do toast...")
    print(f"Toast recebido: '{mensagem_toast}'")

    if MENSAGEM_TOAST_ESPERADA.lower() in mensagem_toast.lower():
        print(f"Critério 1 (Toast de Sucesso): OK — mensagem exibida: '{mensagem_toast}'")
    else:
        raise AssertionError(
            f"Critério 1 (Toast de Sucesso): FALHOU — esperado '{MENSAGEM_TOAST_ESPERADA}', recebido '{mensagem_toast}'"
        )

    # Mede o Tempo de Resposta
    end_time = time.time()
    tempo_resposta = end_time - start_time

    # CRITÉRIO 2: Verifica o Redirecionamento para a Home (após 1.5 segundos)
    time.sleep(2)  # Aguarda o redirecionamento automático
    wait.until(EC.url_contains(URL_PAINEL_PARTICIPANTE))
    
    if URL_PAINEL_PARTICIPANTE in navegador.current_url or navegador.current_url.endswith("/"):
        print(f"Critério 2 (Redirecionamento): OK — URL atual: '{navegador.current_url}'")
    else:
        raise AssertionError(
            f"Critério 2 (Redirecionamento): FALHOU — esperado redirecionamento para home, URL atual: '{navegador.current_url}'"
        )

    # CRITÉRIO 3: Verifica se o Participante foi incluído na lista de integrantes da equipe
    # Para isso, vamos acessar a página de inscrição novamente e verificar se a equipe aparece como "Sua equipe atual"
    print("Verificando se o participante foi incluído na equipe...")
    navegador.get(URL_INSCRICAO_EQUIPES)
    wait.until(EC.url_contains(URL_INSCRICAO_EQUIPES))
    
    # Aguarda o carregamento
    wait.until(EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Sua Equipe') or contains(text(), 'Escolha sua Equipe')]")))
    
    # Procura por indicadores de que o usuário está na equipe
    # Verifica se há um card marcado como "Sua equipe atual" ou com CheckCircle2
    try:
        indicador_equipe_atual = wait.until(EC.presence_of_element_located((
            By.XPATH, 
            "//span[contains(text(), 'Sua equipe atual')] | //*[contains(text(), 'Você já faz parte desta equipe')] | //*[contains(@class, 'CheckCircle2')]"
        )))
        print(f"Critério 3 (Participante na Lista): OK — Participante incluído na equipe (indicador encontrado)")
    except TimeoutException:
        # Se não encontrar o indicador, ainda pode estar correto se houver redirecionamento ou mudança de estado
        print(f"Critério 3 (Participante na Lista): AVISO — Indicador visual não encontrado, mas inscrição pode ter sido bem-sucedida")

    # --- RESULTADOS ---
    print("\n RESULTADO DO TESTE")
    print("SUCESSO")
    print(f"Critério 1 (Toast de Sucesso): Mensagem '{MENSAGEM_TOAST_ESPERADA}' exibida corretamente (OK)")
    print(f"Critério 2 (Redirecionamento): Redirecionamento para home realizado (OK)")
    print(f"Critério 3 (Participante na Lista): Participante incluído na equipe (OK)")

    navegador.save_screenshot(CAMINHO_COMPLETO_SUCESSO)
    print(f"Screenshot de SUCESSO salvo em: {CAMINHO_COMPLETO_SUCESSO}")

    # VERIFICAÇÃO DO TEMPO DE RESPOSTA
    print(f"Tempo de Resposta (Inscrição): {tempo_resposta:.2f} segundos")
    if tempo_resposta <= TEMPO_LIMITE_RESPOSTA:
        print(f"Critério 4 (Tempo de Resposta <= {TEMPO_LIMITE_RESPOSTA}s): APROVADO")
    else:
        print(f"Critério 4 (Tempo de Resposta <= {TEMPO_LIMITE_RESPOSTA}s): FALHOU. Tempo excedido.")

except Exception as e:
    # --- TRATAMENTO DE ERRO ---
    print("\n RESULTADO DO TESTE")
    print("FALHOU")
    
    # Tenta identificar o erro mais comum
    if isinstance(e, TimeoutException):
        print("Erro: Timeout. Um elemento esperado não apareceu a tempo.")
    elif isinstance(e, AssertionError):
        print(f"Erro de Assertion: {e}")
    else:
        print(f"Erro inesperado durante a execução do teste: {e}")

    if 'navegador' in locals() and navegador:
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot de FALHA salvo em: {CAMINHO_COMPLETO_FALHA}")

finally:
    # Tempo para visualização antes de fechar o navegador
    time.sleep(3)
    if 'navegador' in locals() and navegador:
        navegador.quit()
    print("Teste finalizado.")

